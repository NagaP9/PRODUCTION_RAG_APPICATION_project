from src.prompt import build_prompt

def answer_query(retriever, llm, query):
    docs = retriever.invoke(query)
    context = "\n\n".join(doc.page_content for doc in docs)
    prompt = build_prompt(context, query)
    response = llm.invoke(prompt)
    return response.content, docs