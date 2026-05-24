from config.settings import TOP_K

def get_retriever(vectordb):
    return vectordb.as_retriever(search_kwargs={"k": 4})