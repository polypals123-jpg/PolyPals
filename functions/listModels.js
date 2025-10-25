const fetch = require("node-fetch");

const GEMINI_API_KEY = "AIzaSyC8jB4BXHun7bPt3Zm7cfYQQcR9HhVJAFw";

async function listModels() {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    );
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
