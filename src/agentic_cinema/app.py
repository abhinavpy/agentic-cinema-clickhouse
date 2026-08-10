"""Minimal chat UI for the Cutting Room Copilot.

Run with: streamlit run src/agentic_cinema/app.py
"""
import asyncio

import streamlit as st

from agentic_cinema.agent import ask

st.set_page_config(page_title="Cutting Room Copilot", page_icon="🎬")
st.title("🎬 Cutting Room Copilot")
st.caption("Audience analytics for editorial, grounded in ClickHouse Cloud + Gemini")

if "messages" not in st.session_state:
    st.session_state.messages = []

for role, content in st.session_state.messages:
    with st.chat_message(role):
        st.markdown(content)

if prompt := st.chat_input("Ask about audience behavior, e.g. 'Where do viewers drop off in episode 3?'"):
    st.session_state.messages.append(("user", prompt))
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Querying ClickHouse and analyzing..."):
            answer = asyncio.run(ask(prompt))
            st.markdown(answer)
    st.session_state.messages.append(("assistant", answer))
