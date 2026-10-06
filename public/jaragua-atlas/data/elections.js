export const CITY_2026 = {
  electorate: 131454,
  turnout: 111510,
  turnoutPct: 84.83,
  abstention: 19944,
  abstentionPct: 15.17,
  valid: 108628,
  blank: 1262,
  nullVotes: 1620,
  sections: 384,
  totalSections: 384,
  candidates: [
    { name: 'Flávio Bolsonaro', number: 22, votes: 78938, share: 72.67 },
    { name: 'Lula', number: 13, votes: 20528, share: 18.90 },
    { name: 'Renan Santos', number: 14, votes: 3450, share: 3.18 },
    { name: 'Escritor Augusto Cury', number: 70, votes: 3196, share: 2.94 },
    { name: 'Ronaldo Caiado', number: 55, votes: 1628, share: 1.50 },
    { name: 'Zema', number: 30, votes: 587, share: 0.54 },
    { name: 'Samara', number: 80, votes: 164, share: 0.15 },
    { name: 'Hertz Dias', number: 16, votes: 40, share: 0.04 },
    { name: 'Edmilson Costa', number: 21, votes: 32, share: 0.03 },
    { name: 'Clariana Barão', number: 27, votes: 29, share: 0.03 },
    { name: 'Rui Costa Pimenta', number: 29, votes: 23, share: 0.02 },
    { name: 'Veterinário Wilson Grassi', number: 35, votes: 13, share: 0.01 }
  ]
};

export const LOCAL_2026 = [
  ['AMIZADE',567,367,64.73,123,21.69,690,15.51,7,9],
  ['BARRA DO RIO CERRO',7589,5773,76.07,1230,16.21,9024,14.04,85,83],
  ['BARRA DO RIO MOLHA',3942,2897,73.49,660,16.74,4694,14.06,30,62],
  ['BOA VISTA',277,184,66.43,72,25.99,369,21.41,7,6],
  ['BRAÇO DO RIBEIRÃO CAVALO',1369,919,67.13,345,25.20,1765,19.21,25,32],
  ['CENTRO',17266,12364,71.61,3242,18.78,20827,15.45,143,201],
  ['CHICO DE PAULO',1357,959,70.67,293,21.59,1669,15.58,18,34],
  ['CZERNIEWICZ',2655,1982,74.65,435,16.38,3172,14.63,22,31],
  ['ESTRADA NOVA',2614,1751,66.99,657,25.13,3215,16.02,26,60],
  ['GARIBALDI',1788,1480,82.77,222,12.42,2090,12.20,26,21],
  ['ILHA DA FIGUEIRA',7658,5663,73.95,1395,18.22,9165,14.16,94,115],
  ['JARAGUÁ 84',1323,938,70.90,286,21.62,1678,17.58,28,32],
  ['JARAGUÁ 99',2894,2141,73.98,543,18.76,3547,16.01,41,44],
  ['JARAGUÁ ESQUERDO',2848,2101,73.77,491,17.24,3378,13.50,32,42],
  ['JOÃO PESSOA',3673,2690,73.24,691,18.81,4434,15.09,37,55],
  ['NEREU RAMOS',2857,1995,69.83,650,22.75,3543,16.96,39,46],
  ['NOVA BRASILIA',3470,2565,73.92,615,17.72,4292,16.61,53,56],
  ['RAU',7570,5475,72.32,1413,18.67,9228,15.72,90,117],
  ['RIBEIRÃO GRANDE DO NORTE',258,203,78.68,39,15.12,299,11.37,1,6],
  ['RIO CERRO I',978,764,78.12,145,14.83,1165,13.39,15,16],
  ['RIO CERRO II',1800,1404,78.00,264,14.67,2087,11.93,15,23],
  ['RIO DA LUZ',2100,1576,75.05,374,17.81,2519,14.97,17,25],
  ['RIO DA LUZ II',725,615,84.83,71,9.79,828,10.27,9,9],
  ['RIO MOLHA',703,535,76.10,124,17.64,814,11.43,9,9],
  ['SANTA LUZIA',1368,980,71.64,278,20.32,1691,16.56,22,21],
  ['SANTO ANTÔNIO',1975,1252,63.39,564,28.56,2520,18.10,43,46],
  ['SÃO LUIS',3975,2963,74.54,711,17.89,4723,13.83,46,49],
  ['TIFA MARTINS',3761,2570,68.33,842,22.39,4628,15.86,48,85],
  ['TIFA MONOS',397,294,74.06,63,15.87,492,17.07,2,9],
  ['TRÊS RIOS DO NORTE',4114,2800,68.06,968,23.53,5032,15.20,77,76],
  ['TRÊS RIOS DO SUL',450,318,70.67,81,18.00,556,15.47,9,11],
  ['VIEIRA',2540,1827,71.93,514,20.24,3082,15.74,30,27],
  ['VILA CHARTRES',280,227,81.07,38,13.57,313,10.22,1,0],
  ['VILA LALAU',5059,3739,73.91,850,16.80,6201,16.63,49,62],
  ['VILA LENZI',2654,1848,69.63,571,21.51,3261,16.62,27,38],
  ['VILA NOVA',1002,775,77.35,154,15.37,1181,13.21,8,15],
  ['ÁGUA VERDE',2772,2004,72.29,514,18.54,3282,13.16,31,47]
].map(([name,valid,blueVotes,blueShare,redVotes,redShare,electorate,abstentionPct,blank,nullVotes]) => ({
  name, valid, blueVotes, blueShare, redVotes, redShare, electorate, abstentionPct, blank, nullVotes,
  otherVotes: Number(valid) - Number(blueVotes) - Number(redVotes)
}));

export const DATA_SOURCES = {
  report2026: 'Análise Presidencial 2026 — Jaraguá do Sul (384/384 boletins reconciliados com TSE)',
  ibgeNeighborhoods: 'IBGE — Censo Demográfico 2022, malha de bairros de Santa Catarina',
  ibgeMunicipality: 'IBGE — Malha Municipal 2024, Santa Catarina',
  election2022: 'TSE Dados Abertos; resultado municipal oficial do 2º turno e top-15 locais geolocalizados via NanoIris'
};
