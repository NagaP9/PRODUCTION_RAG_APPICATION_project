def build_prompt(context, query):
    return f"""
Use only the context below to answer the question.
If the answer is not in the context, say you don't know.

Context:
{context}

Question:
{query}

Answer:
"""