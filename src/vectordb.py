from langchain_community.vectorstores import FAISS

def build_vector_store(chunks, embedding_model):
    return FAISS.from_documents(chunks, embedding_model)
