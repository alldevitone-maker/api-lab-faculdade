# Building with AI in Public

## September 2026

### The roadmap that was never planned

I did not start with a master architecture. I started with a problem, then another problem appeared, and then another. What began as a few conversations with an LLM gradually became a practical system for working with context, tools, files, APIs, automation, versioning and knowledge.

This page documents that evolution in public.

## Stage 1

The original goal was simple: use AI to solve real problems faster without losing control of the work. That quickly exposed a harder question. How do you keep the context useful, the sources traceable, the changes reproducible and the final decisions human controlled?

The first stage grew through real problems, human orchestration, conversations and context, Termux and Python, APIs and authentication, Classroom and Drive workflows, audit and versioning, and Obsidian as a knowledge base. None of those layers were added because they looked interesting on a roadmap. They appeared because the previous layer created a new problem.

The focus moved beyond simply asking an AI for answers. The work became more about context management, source traceability, versioning, governance, automation, knowledge architecture, separating public, academic and private material, and deciding which actions should remain under human control.

The API Lab is one public artifact created during this process:

https://github.com/alldevitone-maker/api-lab-faculdade

It is a learning focused environment for understanding HTTP APIs through interactive examples and simulations. It is not the entire roadmap. It is one concrete output from it.

## Stage 2

The second stage is less about adding tools and more about making the system survive change.

Over the last few days I have been turning experiments into a more deliberate working architecture. Academic material and private development work are being separated instead of mixed together. Stable versions are being frozen before new changes begin. Knowledge is being reorganized so that the same material can be read as documentation, explored through a graph and reused later without rebuilding the context from zero.

That also changed the role of AI in the process. The useful part is no longer the answer itself. The useful part is maintaining continuity between conversations, files, repositories, academic material and decisions while keeping an auditable trail of what changed and why.

Obsidian became more than a place for notes. GitHub became more than a place for source code. Drive became more than storage. Termux became more than a terminal. Together they started acting as different interfaces to the same evolving body of work.

I am currently between roles, so I decided to treat this period as a build window instead of a waiting room. I am studying, documenting, shipping public artifacts and turning the things I learn into systems I can inspect, break, rebuild and explain.

The next phase is to push this architecture further into agents, MCP, RAG and observability without losing the principles that made the earlier stages useful: human control, traceability, reproducibility and clear separation between experiments and claims about production experience.

## Principle

> I did not plan this roadmap. Problems created it.

This document will keep evolving as the work evolves.
