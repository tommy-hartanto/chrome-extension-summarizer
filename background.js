// Initialize IndexedDB
let db;
const dbName = "LinkSummarizerDB";
const dbVersion = 3; // Increment the version number

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("Database opened successfully");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains("summaries")) {
        const objectStore = db.createObjectStore("summaries", { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("url", "url", { unique: false });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
      } else {
        const objectStore = event.target.transaction.objectStore("summaries");
        if (!objectStore.indexNames.contains("url")) {
          objectStore.createIndex("url", "url", { unique: false });
        }
        if (!objectStore.indexNames.contains("timestamp")) {
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      }
    };
  });
}

// Ensure database is open before performing operations
let dbPromise = openDatabase();

// ... (previous IndexedDB setup code remains the same)

// Function to summarize text using Perplexity API
async function summarizeText(text, url) {
  const apiKey = 'PERPLEXITY-API-KEY'; // Replace with your actual Perplexity API key
  const apiUrl = 'https://api.perplexity.ai/chat/completions';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes web pages."
          },
          {
            role: "user",
            content: `Please summarize the following text from ${url} in a concise manner:\n\n${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("API call failed:", error);
    return "Failed to generate summary. Please try again later.";
  }
}

function storeSummary(url, title, summary) {
  return dbPromise.then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["summaries"], "readwrite");
      const objectStore = transaction.objectStore("summaries");
      const request = objectStore.add({
        url: url,
        title: title,
        summary: summary,
        timestamp: new Date().getTime()
      });

      request.onerror = (event) => {
        console.error("Error storing summary:", event.target.error);
        reject("Error storing summary");
      };

      request.onsuccess = (event) => {
        console.log("Summary stored successfully");
        resolve();
      };
    });
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    summarizeText(request.text, request.url)
      .then(summary => {
        return storeSummary(request.url, request.title, summary).then(() => summary);
      })
      .then(summary => {
        console.log("Generated and stored new summary:", summary);
        sendResponse({ summary: summary });
      })
      .catch(error => {
        console.error("Summarization error:", error);
        sendResponse({ error: "Failed to summarize" });
      });

    return true; // Indicates we will send a response asynchronously
  }
});