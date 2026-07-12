import streamlit as st
from utils.file_handler import save_uploaded_file
from src.loaders import load_pdf
from src.splitter import split_documents
from src.embeddings import get_embedding_model
from src.vectordb import build_vector_store
from src.retriever import get_retriever
from src.llm import get_llm
from src.rag_service import answer_query

st.set_page_config(page_title="PDF RAG with FAISS", layout="wide")
st.title("Chat with your PDF")

uploaded_file = st.file_uploader("Upload a PDF", type="pdf")

if uploaded_file is not None:
    with st.spinner("Processing PDF..."):
        file_path = save_uploaded_file(uploaded_file)   #file handler module
        docs = load_pdf(file_path) #loaders module
        chunks = split_documents(docs) #splitters module
        embedding_model = get_embedding_model() #embedding module
        vectordb = build_vector_store(chunks, embedding_model) #vectordb module
        retriever = get_retriever(vectordb) #retrevier module
        llm = get_llm() #llm module
        

        st.session_state["retriever"] = retriever
        st.session_state["llm"] = llm
        st.success("PDF indexed successfully.")

query = st.text_input("Ask a question")

if query and "retriever" in st.session_state:
    answer, docs = answer_query(
        st.session_state["retriever"],
        st.session_state["llm"],
        query
    )
    st.subheader("Answer")
    st.write(answer)

    with st.expander("Sources"):
        for i, doc in enumerate(docs, 1):
            st.write(f"Chunk {i}")
            st.write(doc.page_content)
            st.write(doc.metadata)