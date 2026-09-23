// Motor didático migrado sem mudar a lógica: simula HTTP localmente e não envia requisições.

export const ApiLabCore = (() => {
  const METHODS = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"];
  const FORMATS = ["http","curl","fetch"];
  const BODY_METHODS = ["POST","PUT","PATCH"];

  function normalizeToken(token){
    const value = String(token || "").trim();
    return value.replace(/^Bearer\s+/i,"");
  }

  function isValidHttpUrl(value){
    try{
      const u = new URL(value);
      return (u.protocol === "http:" || u.protocol === "https:") &&
        Boolean(u.hostname) && !u.username && !u.password && !u.search && !u.hash;
    }catch{
      return false;
    }
  }

  function cleanBase(value){
    return String(value || "").trim().replace(/\/+$/,"");
  }

  function cleanResource(value){
    return String(value || "").trim().replace(/^\/+|\/+$/g,"");
  }

  function allowsBody(method){
    return BODY_METHODS.includes(method);
  }

  function validate(state){
    const errors = [];
    const warnings = [];
    const method = String(state.method || "").toUpperCase();

    if(!METHODS.includes(method)){
      errors.push({field:"method",message:"Método HTTP inválido."});
    }

    if(!state.base || !String(state.base).trim()){
      errors.push({field:"base",message:"Informe a Base URL."});
    }else if(!isValidHttpUrl(String(state.base).trim())){
      errors.push({field:"base",message:"A Base URL precisa começar com http:// ou https:// e ser uma URL válida."});
    }

    if(!state.resource || !cleanResource(state.resource)){
      errors.push({field:"resource",message:"Informe um recurso, como usuarios ou alunos."});
    }else if(cleanResource(state.resource).split("/").some(part => !part || part === "." || part === ".." || /[?#\\\s]/.test(part))){
      errors.push({field:"resource",message:"Use apenas um caminho de recurso, como alunos ou turmas/1/alunos, sem espaços, ?, # ou segmentos vazios."});
    }

    const queries = Array.isArray(state.queries) ? state.queries : [];
    queries.forEach((q,index) => {
      const key = String(q.key || "").trim();
      const value = String(q.value || "").trim();

      if(!key && value){
        errors.push({field:"qk" + (index + 1),message:"A query " + (index + 1) + " possui valor, mas está sem chave."});
      }

      if(key && !value){
        warnings.push("A query " + (index + 1) + " está com valor vazio. Isso é válido, mas confirme se era sua intenção.");
      }
    });

    const hk = String(state.headerKey || "").trim();
    const hv = String(state.headerValue || "").trim();
    const auth = String(state.auth || "");

    if(!hk && hv){
      errors.push({field:"hk",message:"Existe um valor de header, mas o nome do header está vazio."});
    }

    if(hk && !hv){
      errors.push({field:"hv",message:"Informe o valor do header customizado."});
    }
    if(hk && !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(hk)){
      errors.push({field:"hk",message:"Nome de header inválido. Exemplo válido: X-API-Key (sem espaços ou dois-pontos)."});
    }
    if(/[\r\n]/.test(hv)) errors.push({field:"hv",message:"O valor do header deve ocupar uma única linha."});
    if(/[\r\n]/.test(auth)) errors.push({field:"auth",message:"O token deve ocupar uma única linha."});
    if(/^(accept|content-type|authorization)$/i.test(hk)){
      errors.push({field:"hk",message:"Este header já é gerenciado pelo laboratório. Use o campo de token para Authorization."});
    }

    const rawBody = String(state.body || "").trim();

    if(allowsBody(method) && rawBody){
      try{
        const parsed = JSON.parse(rawBody);
        if(!parsed || Array.isArray(parsed) || typeof parsed !== "object"){
          errors.push({field:"body",message:"Use um objeto JSON com campos, por exemplo: {\"nome\":\"Maria\"}."});
        }
      }catch(error){
        errors.push({field:"body",message:"O Body JSON é inválido: " + error.message});
      }
    }

    if(!allowsBody(method) && rawBody){
      warnings.push(method + " está configurado sem body neste laboratório. O conteúdo digitado será ignorado.");
    }

    if((method === "PUT" || method === "PATCH" || method === "DELETE") && !String(state.id || "").trim()){
      errors.push({field:"rid",message:"Para " + method + " nesta simulação, preencha o ID do registro, como 42."});
    }
    if(method === "POST" && String(state.id || "").trim()){
      errors.push({field:"rid",message:"Para criar com POST nesta simulação, deixe o ID vazio; a resposta informará o novo ID."});
    }
    if(allowsBody(method) && !rawBody){
      errors.push({field:"body",message:"Para " + method + ", preencha o Body JSON. Exemplo: {\"nome\":\"Maria\"}."});
    }

    return {errors,warnings};
  }

  function buildUrl(state){
    const base = cleanBase(state.base);
    const resource = cleanResource(state.resource);
    const id = String(state.id || "").trim();

    let url = base + "/" + resource.split("/").map(encodeURIComponent).join("/");

    if(id){
      url += "/" + encodeURIComponent(id);
    }

    const params = new URLSearchParams();
    (state.queries || []).forEach(q => {
      const key = String(q.key || "").trim();
      const value = String(q.value || "");
      if(key) params.append(key,value);
    });

    const query = params.toString();
    if(query) url += "?" + query;

    return url;
  }

  function parseBody(state){
    const raw = String(state.body || "").trim();

    if(!allowsBody(state.method) || !raw){
      return {raw:"",pretty:"",value:null};
    }

    const value = JSON.parse(raw);
    return {
      raw,
      pretty:JSON.stringify(value,null,2),
      value
    };
  }

  function getHeaders(state,hasBody){
    const headers = [["Accept","application/json"]];

    if(hasBody){
      headers.push(["Content-Type","application/json"]);
    }

    const token = normalizeToken(state.auth);
    if(token){
      headers.push(["Authorization","Bearer " + token]);
    }

    const hk = String(state.headerKey || "").trim();
    const hv = String(state.headerValue || "").trim();

    if(hk && hv){
      headers.push([hk,hv]);
    }

    return headers;
  }

  function escapeShellSingleQuotes(value){
    return String(value).replace(/'/g,"'\\''");
  }

  function generate(state){
    const normalizedState = {
      ...state,
      method:String(state.method || "").toUpperCase(),
      format:String(state.format || "http").toLowerCase()
    };

    const verdict = validate(normalizedState);
    if(verdict.errors.length){
      return {
        ok:false,
        errors:verdict.errors,
        warnings:verdict.warnings,
        output:"",
        url:""
      };
    }

    if(!FORMATS.includes(normalizedState.format)){
      return {
        ok:false,
        errors:[{field:"format",message:"Formato de saída inválido."}],
        warnings:verdict.warnings,
        output:"",
        url:""
      };
    }

    const url = buildUrl(normalizedState);
    const body = parseBody(normalizedState);
    const hasBody = Boolean(body.pretty);
    const headers = getHeaders(normalizedState,hasBody);
    let output = "";

    if(normalizedState.format === "http"){
      output = normalizedState.method + " " + url + "\n";
      output += headers.map(([k,v]) => k + ": " + v).join("\n");

      if(hasBody){
        output += "\n\n" + body.pretty;
      }
    }

    if(normalizedState.format === "curl"){
      output = "curl -X " + normalizedState.method + " '" + escapeShellSingleQuotes(url) + "'";

      headers.forEach(([k,v]) => {
        output += " \\\n  -H '" + escapeShellSingleQuotes(k + ": " + v) + "'";
      });

      if(hasBody){
        output += " \\\n  -d '" + escapeShellSingleQuotes(body.pretty) + "'";
      }
    }

    if(normalizedState.format === "fetch"){
      const headerObject = headers
        .map(([k,v]) => "    " + JSON.stringify(k) + ": " + JSON.stringify(v))
        .join(",\n");

      output = `fetch(${JSON.stringify(url)}, {
  method: "${normalizedState.method}",
  headers: {
${headerObject}
  }`;

      if(hasBody){
        output += `,\n  body: JSON.stringify(${body.pretty})`;
      }

      output += `
})
.then(async response => {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw {
      status: response.status,
      statusText: response.statusText,
      data
    };
  }

  return {
    status: response.status,
    data
  };
})
.then(result => console.log(result))
.catch(error => console.error(error));`;
    }

    return {
      ok:true,
      errors:[],
      warnings:verdict.warnings,
      output,
      url,
      headers,
      hasBody
    };
  }

  function simulate(method,forcedStatus){
    const m = String(method || "GET").toUpperCase();

    const errorMap = {
      400:{name:"Bad Request",message:"A requisição está inválida ou mal formada.",hint:"Revise URL, parâmetros, headers e JSON."},
      401:{name:"Unauthorized",message:"A autenticação está ausente ou inválida.",hint:"Revise token, chave ou sessão."},
      403:{name:"Forbidden",message:"O cliente foi identificado, mas não tem permissão suficiente.",hint:"Revise permissões e escopos."},
      404:{name:"Not Found",message:"O recurso ou rota não foi encontrado.",hint:"Revise caminho, ID e ambiente da API."},
      409:{name:"Conflict",message:"A operação conflita com o estado atual do recurso.",hint:"Verifique duplicidade, versão ou regra de negócio."},
      422:{name:"Unprocessable Content",message:"A sintaxe pode estar correta, mas os dados não passam na validação semântica.",hint:"Revise campos obrigatórios e regras de domínio."},
      429:{name:"Too Many Requests",message:"O cliente excedeu o limite de requisições.",hint:"Aguarde, respeite Retry-After e aplique backoff quando apropriado."},
      500:{name:"Internal Server Error",message:"O servidor encontrou uma falha inesperada.",hint:"Revise logs e correlação da requisição."},
      503:{name:"Service Unavailable",message:"O serviço está temporariamente indisponível.",hint:"Tente novamente depois e verifique dependências."}
    };

    if(forcedStatus && errorMap[forcedStatus]){
      return {
        status:forcedStatus,
        statusText:errorMap[forcedStatus].name,
        body:{
          error:errorMap[forcedStatus].name,
          message:errorMap[forcedStatus].message
        },
        hint:errorMap[forcedStatus].hint
      };
    }

    return null;
  }

  function newDatabase(){
    return {
      alunos:[
        {id:1,nome:"Ana",curso:"ADS",status:"ativo"},
        {id:2,nome:"Bruno",curso:"Engenharia de Software",status:"inativo"},
        {id:42,nome:"Humano",curso:"Ciência da Computação",status:"ativo"}
      ]
    };
  }

  // Modelo didático local. Os resultados de uma API real dependem do contrato e dos dados dela.
  function simulateRequest(state,database){
    const result = generate(state);
    if(!result.ok){
      return {status:0,statusText:"Erro de preenchimento local",body:{errors:result.errors.map(e => e.message)}};
    }
    const method = String(state.method).toUpperCase();
    const resource = cleanResource(state.resource);
    const records = database[resource] || (database[resource] = []);
    const id = String(state.id || "").trim();
    const index = records.findIndex(record => String(record.id) === id);
    const missing = () => ({status:404,statusText:"Not Found",body:{error:"Registro não encontrado",id,resource}});

    if(method === "OPTIONS"){
      return {status:204,statusText:"No Content",body:null,headers:{Allow:"GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"}};
    }
    if((method === "GET" || method === "HEAD") && id && index < 0){
      return method === "HEAD" ? {status:404,statusText:"Not Found",body:null} : missing();
    }

    if(method === "GET" || method === "HEAD"){
      let data = id ? records[index] : records.slice();
      if(!id){
        const params = new URLSearchParams(result.url.split("?")[1] || "");
        const page = params.get("page") || "1";
        const limit = params.get("limit") || String(records.length || 1);
        if(!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit)){
          return {status:400,statusText:"Bad Request",body:method === "HEAD" ? null : {error:"page e limit devem ser inteiros positivos"}};
        }
        for(const [key,value] of params){
          if(key !== "page" && key !== "limit" && value){
            data = data.filter(record => String(record[key] ?? "").toLocaleLowerCase() === value.toLocaleLowerCase());
          }
        }
        data = data.slice((Number(page) - 1) * Number(limit),Number(page) * Number(limit));
      }
      if(method === "HEAD"){
        return {status:200,statusText:"OK",body:null,headers:{"Content-Type":"application/json","Content-Length":String(new TextEncoder().encode(JSON.stringify(data)).length)}};
      }
      return {status:200,statusText:"OK",body:data};
    }

    if(method === "POST"){
      const payload = parseBody(state).value;
      const nextId = Math.max(100,...records.map(record => Number(record.id) || 0)) + 1;
      const created = {...payload,id:nextId};
      records.push(created);
      return {status:201,statusText:"Created",body:{...created},headers:{Location:result.url.split("?")[0] + "/" + nextId}};
    }
    if(index < 0) return missing();
    if(method === "DELETE"){
      records.splice(index,1);
      return {status:204,statusText:"No Content",body:null};
    }
    const payload = parseBody(state).value;
    const previousId = records[index].id;
    records[index] = method === "PUT"
      ? {...payload,id:previousId}
      : {...records[index],...payload,id:previousId};
    return {status:200,statusText:"OK",body:{...records[index]}};
  }

  function audit(){
    const bodies = ["", '{"nome":"Humano","curso":"ADS"}'];
    const querySets = [
      [],
      [{key:"status",value:"ativo"}],
      [{key:"status",value:"ativo"},{key:"page",value:"1"}]
    ];
    const ids = ["","42"];
    const auths = ["","token-teste"];
    const customHeaders = [
      ["",""],
      ["X-API-Key","chave-teste"]
    ];

    let total = 0;
    let passed = 0;
    const failures = [];

    for(const method of METHODS){
      for(const format of FORMATS){
        for(const body of bodies){
          for(const queries of querySets){
            for(const id of ids){
              for(const auth of auths){
                for(const [headerKey,headerValue] of customHeaders){
                  total++;

                  const state = {
                    method,
                    format,
                    base:"https://api.teste.dev",
                    resource:"alunos",
                    id:method === "POST" ? "" : (["PUT","PATCH","DELETE"].includes(method) ? "42" : id),
                    queries,
                    auth,
                    headerKey,
                    headerValue,
                    body:allowsBody(method) ? (body || '{"nome":"Humano"}') : body
                  };

                  const result = generate(state);

                  try{
                    if(!result.ok) throw new Error("Combinação válida foi rejeitada.");
                    if(!result.url.startsWith("https://api.teste.dev/alunos")) throw new Error("URL final incorreta.");
                    if(result.output.includes("undefined")) throw new Error("Saída contém undefined.");
                    if(format === "http" && !result.output.startsWith(method + " ")) throw new Error("Saída HTTP não inicia com o método.");
                    if(format === "curl" && !result.output.startsWith("curl -X " + method)) throw new Error("Saída cURL incorreta.");
                    if(format === "fetch" && !result.output.includes('method: "' + method + '"')) throw new Error("Saída fetch não contém método.");
                    if(format === "fetch" && !result.output.includes("await response.text()")) throw new Error("Fetch não trata resposta vazia.");
                    if(format === "fetch" && result.output.includes("response.json()")) throw new Error("Fetch usa response.json() incondicional.");

                    const bodyShouldExist = allowsBody(method);
                    if(result.hasBody !== bodyShouldExist) throw new Error("Regra de body inconsistente.");

                    if(!allowsBody(method) && result.output.includes('"nome":"Humano"')){
                      throw new Error("Método sem body carregou conteúdo de body.");
                    }

                    if(auth && !result.output.includes("Authorization")){
                      throw new Error("Authorization não foi gerado.");
                    }

                    if(headerKey && !result.output.includes("X-API-Key")){
                      throw new Error("Header customizado não foi gerado.");
                    }

                    passed++;
                  }catch(error){
                    failures.push({
                      method,format,body:Boolean(body),queries:queries.length,id:Boolean(id),auth:Boolean(auth),header:Boolean(headerKey),error:error.message
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    const invalidCases = [
      {
        name:"URL vazia",
        state:{method:"GET",format:"http",base:"",resource:"alunos",queries:[]},
        field:"base"
      },
      {
        name:"URL inválida",
        state:{method:"GET",format:"http",base:"api.teste.dev",resource:"alunos",queries:[]},
        field:"base"
      },
      {
        name:"Recurso vazio",
        state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"",queries:[]},
        field:"resource"
      },
      {
        name:"JSON inválido",
        state:{method:"POST",format:"http",base:"https://api.teste.dev",resource:"alunos",queries:[],body:'{"nome":}'},
        field:"body"
      },
      {
        name:"Query sem chave",
        state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",queries:[{key:"",value:"ativo"}]},
        field:"qk1"
      },
      {
        name:"Header sem nome",
        state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",queries:[],headerKey:"",headerValue:"abc"},
        field:"hk"
      },
      {
        name:"Header sem valor",
        state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",queries:[],headerKey:"X-Test",headerValue:""},
        field:"hv"
      },
      {
        name:"POST sem body",state:{method:"POST",format:"http",base:"https://api.teste.dev",resource:"alunos"},field:"body"
      },
      {
        name:"PUT sem ID",state:{method:"PUT",format:"http",base:"https://api.teste.dev",resource:"alunos",body:'{"nome":"Ana"}'},field:"rid"
      },
      {
        name:"PATCH sem ID",state:{method:"PATCH",format:"http",base:"https://api.teste.dev",resource:"alunos",body:'{"nome":"Ana"}'},field:"rid"
      },
      {
        name:"DELETE sem ID",state:{method:"DELETE",format:"http",base:"https://api.teste.dev",resource:"alunos"},field:"rid"
      },
      {
        name:"POST com ID",state:{method:"POST",format:"http",base:"https://api.teste.dev",resource:"alunos",id:"42",body:'{"nome":"Ana"}'},field:"rid"
      },
      {
        name:"Body array",state:{method:"POST",format:"http",base:"https://api.teste.dev",resource:"alunos",body:'[1,2]'},field:"body"
      },
      {
        name:"URL com query",state:{method:"GET",format:"http",base:"https://api.teste.dev?x=1",resource:"alunos"},field:"base"
      },
      {
        name:"Header com quebra de linha",state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",headerKey:"X-Test",headerValue:"x\ny"},field:"hv"
      },
      {
        name:"Header reservado",state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",headerKey:"Authorization",headerValue:"abc"},field:"hk"
      },
      {
        name:"Recurso com query",state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos?status=ativo"},field:"resource"
      },
      {
        name:"Query 2 sem chave",state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",queries:[{key:"",value:""},{key:"",value:"2"}]},field:"qk2"
      },
      {
        name:"Token multilinha",state:{method:"GET",format:"http",base:"https://api.teste.dev",resource:"alunos",auth:"abc\ndef"},field:"auth"
      },
      {
        name:"JSON nulo",state:{method:"PATCH",format:"http",base:"https://api.teste.dev",resource:"alunos",id:"42",body:"null"},field:"body"
      }
    ];

    let invalidPassed = 0;

    invalidCases.forEach(test => {
      total++;
      const result = generate(test.state);
      const found = !result.ok && result.errors.some(e => e.field === test.field);
      if(found){
        passed++;
        invalidPassed++;
      }else{
        failures.push({invalidCase:test.name,error:"Validação esperada não foi detectada."});
      }
    });

    const encoded = generate({
      method:"GET",
      format:"http",
      base:"https://api.teste.dev",
      resource:"busca",
      id:"",
      queries:[{key:"nome completo",value:"Ana Silva"}],
      auth:"",
      headerKey:"",
      headerValue:"",
      body:""
    });

    total++;
    if(encoded.ok && encoded.url.includes("nome+completo=Ana+Silva")){
      passed++;
    }else{
      failures.push({invalidCase:"URL encoding",error:"Query não foi codificada como esperado."});
    }

    const bearer = generate({
      method:"GET",
      format:"http",
      base:"https://api.teste.dev",
      resource:"perfil",
      id:"",
      queries:[],
      auth:"Bearer abc123",
      headerKey:"",
      headerValue:"",
      body:""
    });

    total++;
    if(bearer.ok && bearer.output.includes("Authorization: Bearer abc123") && !bearer.output.includes("Bearer Bearer")){
      passed++;
    }else{
      failures.push({invalidCase:"Bearer normalization",error:"Token Bearer não foi normalizado."});
    }

    total++;
    const quoted = generate({method:"POST",format:"fetch",base:"https://api.teste.dev",resource:"alunos",body:'{"nome":"Ana"}',headerKey:"X-Test",headerValue:'a"b\\c'});
    if(quoted.ok && quoted.output.includes(JSON.stringify('a"b\\c'))){passed++;}
    else failures.push({scenario:"Escape de aspas no fetch",error:"Header não foi escapado corretamente."});

    total++;
    const shell = generate({method:"POST",format:"curl",base:"https://api.teste.dev",resource:"alunos",body:'{"nome":"Ana"}',headerKey:"X-Test",headerValue:"it's $HOME"});
    if(shell.ok && shell.output.includes("it'\\''s $HOME")){passed++;}
    else failures.push({scenario:"Escape de aspas no cURL",error:"Header não foi escapado corretamente."});

    const db = newDatabase();
    const mockState = (method,id="",body="",queries=[]) => ({method,format:"http",base:"https://api.teste.dev",resource:"alunos",id,body,queries});
    const cases = [
      ["GET lista",() => simulateRequest(mockState("GET"),db).body.length === 3],
      ["GET ID",() => simulateRequest(mockState("GET","42"),db).body.nome === "Humano"],
      ["GET inexistente",() => simulateRequest(mockState("GET","999"),db).status === 404],
      ["GET filtro",() => simulateRequest(mockState("GET","","",[{key:"curso",value:"ADS"}]),db).body.length === 1],
      ["GET paginação",() => simulateRequest(mockState("GET","","",[{key:"limit",value:"1"},{key:"page",value:"2"}]),db).body[0].id === 2],
      ["GET página inválida",() => simulateRequest(mockState("GET","","",[{key:"page",value:"0"}]),db).status === 400],
      ["HEAD mesmo comprimento do GET",() => simulateRequest(mockState("HEAD","42"),db).headers["Content-Length"] === String(new TextEncoder().encode(JSON.stringify(simulateRequest(mockState("GET","42"),db).body)).length)],
      ["HEAD ausente sem body",() => {const r = simulateRequest(mockState("HEAD","999"),db);return r.status === 404 && r.body === null;}],
      ["OPTIONS sem body",() => simulateRequest(mockState("OPTIONS"),db).body === null],
      ["POST cria",() => {const r = simulateRequest(mockState("POST","",'{"nome":"Maria","curso":"ADS"}'),db);return r.status === 201 && r.body.nome === "Maria" && r.headers.Location.endsWith("/" + r.body.id) && simulateRequest(mockState("GET",String(r.body.id)),db).status === 200;}],
      ["PUT substitui",() => {const r = simulateRequest(mockState("PUT","42",'{"nome":"Novo"}'),db);return r.status === 200 && r.body.nome === "Novo" && !("curso" in r.body);}],
      ["PATCH preserva campos",() => {const r = simulateRequest(mockState("PATCH","1",'{"curso":"Redes","id":999}'),db);return r.status === 200 && r.body.id === 1 && r.body.nome === "Ana" && r.body.curso === "Redes";}],
      ["DELETE remove",() => simulateRequest(mockState("DELETE","2"),db).status === 204 && simulateRequest(mockState("GET","2"),db).status === 404],
      ["PUT inexistente",() => simulateRequest(mockState("PUT","999",'{"nome":"X"}'),db).status === 404],
      ["PATCH inexistente",() => simulateRequest(mockState("PATCH","999",'{"nome":"X"}'),db).status === 404],
      ["DELETE inexistente",() => simulateRequest(mockState("DELETE","999"),db).status === 404],
      ["Erro local distinto de HTTP",() => simulateRequest(mockState("POST","",'{"nome":}'),db).status === 0]
    ];
    cases.forEach(([name,check]) => {
      total++;
      try{
        if(!check()) throw new Error("Resultado inesperado.");
        passed++;
      }catch(error){failures.push({scenario:name,error:error.message});}
    });

    return {
      total,
      passed,
      failed:total - passed,
      invalidCases:invalidCases.length,
      failures
    };
  }

  return {
    METHODS,
    FORMATS,
    allowsBody,
    normalizeToken,
    validate,
    buildUrl,
    generate,
    simulate,
    newDatabase,
    simulateRequest,
    audit
  };
})();

if(typeof window !== "undefined"){
  window.ApiLabCore = ApiLabCore;
}
