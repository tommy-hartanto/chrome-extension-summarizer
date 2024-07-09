// Function to group summaries by date
function groupSummariesByDate(summaries) {
  const groups = {};
  summaries.forEach(summary => {
    const date = new Date(summary.date).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(summary);
  });
  return groups;
}

// Function to render summaries
function renderSummaries(summaries) {
  const container = document.getElementById('summaries-container');
  container.innerHTML = '';
  const groups = groupSummariesByDate(summaries);

  for (const [date, dateSummaries] of Object.entries(groups)) {
    const groupElement = document.createElement('div');
    groupElement.className = 'summary-group';

    const headerElement = document.createElement('div');
    headerElement.className = 'summary-group-header';
    headerElement.innerHTML = `
      <span>${date}</span>
      <span class="summary-count">${dateSummaries.length} summaries</span>
    `;
    headerElement.addEventListener('click', () => {
      contentElement.style.display = contentElement.style.display === 'none' ? 'block' : 'none';
    });

    const contentElement = document.createElement('div');
    contentElement.className = 'summary-group-content';

    dateSummaries.forEach(summary => {
      const summaryElement = document.createElement('div');
      summaryElement.className = 'summary-item';
      summaryElement.innerHTML = `
        <div class="summary-title">${summary.title}</div>
        <div class="summary-text">${summary.summary}</div>
        <div class="summary-url">${summary.url}</div>
        <div class="summary-timestamp">Created: ${new Date(summary.timestamp).toLocaleString()}</div>
        <button class="delete-summary" data-id="${summary.id}">Delete</button>
      `;
      contentElement.appendChild(summaryElement);
    });

    groupElement.appendChild(headerElement);
    groupElement.appendChild(contentElement);
    container.appendChild(groupElement);
  }

  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-summary').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      deleteSummary(id);
    });
  });
}

// Function to fetch summaries from IndexedDB
function fetchSummaries() {
  const dbName = "LinkSummarizerDB";
  const dbVersion = 3; // Make sure this matches the version in background.js

  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = (event) => {
    console.error("Error opening database:", event.target.error);
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(["summaries"], "readonly");
    const objectStore = transaction.objectStore("summaries");
    const getAllRequest = objectStore.getAll();

    getAllRequest.onerror = (event) => {
      console.error("Error fetching summaries:", event.target.error);
    };

    getAllRequest.onsuccess = (event) => {
      const summaries = event.target.result;
      renderSummaries(summaries);
    };
  };
}

// Function to render summaries
function renderSummaries(summaries) {
  const container = document.getElementById('summaries-container');
  container.innerHTML = '';

  if (summaries.length === 0) {
    container.innerHTML = '<p>No summaries stored yet.</p>';
    return;
  }

  summaries.forEach(summary => {
    const summaryElement = document.createElement('div');
    summaryElement.className = 'summary-item';
    summaryElement.innerHTML = `
      <h3>${summary.title}</h3>
      <p>${summary.summary}</p>
      <a href="${summary.url}" target="_blank">${summary.url}</a>
      <p>Created: ${new Date(summary.timestamp).toLocaleString()}</p>
    `;
    container.appendChild(summaryElement);
  });
}

// Call fetchSummaries when the popup is opened
document.addEventListener('DOMContentLoaded', fetchSummaries);

// Function to delete a summary
function deleteSummary(id) {
  const dbName = "LinkSummarizerDB";
  const dbVersion = 2; // Update to match background.js version

  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = (event) => {
    console.error("Error opening database:", event.target.error);
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(["summaries"], "readwrite");
    const objectStore = transaction.objectStore("summaries");
    const deleteRequest = objectStore.delete(id);

    deleteRequest.onerror = (event) => {
      console.error("Error deleting summary:", event.target.error);
    };

    deleteRequest.onsuccess = (event) => {
      console.log("Summary deleted successfully");
      fetchSummaries(); // Refresh the list
    };
  };
}

// Function to clear all summaries
function clearAllSummaries() {
  const dbName = "LinkSummarizerDB";
  const dbVersion = 2; // Update to match background.js version

  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = (event) => {
    console.error("Error opening database:", event.target.error);
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(["summaries"], "readwrite");
    const objectStore = transaction.objectStore("summaries");
    const clearRequest = objectStore.clear();

    clearRequest.onerror = (event) => {
      console.error("Error clearing summaries:", event.target.error);
    };

    clearRequest.onsuccess = (event) => {
      console.log("All summaries cleared successfully");
      fetchSummaries(); // Refresh the list
    };
  };
}

// Function to filter summaries based on search query
function filterSummaries(query) {
  const dbName = "LinkSummarizerDB";
  const dbVersion = 2; // Update to match background.js version

  const request = indexedDB.open(dbName, dbVersion);

  request.onerror = (event) => {
    console.error("Error opening database:", event.target.error);
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(["summaries"], "readonly");
    const objectStore = transaction.objectStore("summaries");
    const getAllRequest = objectStore.getAll();

    getAllRequest.onerror = (event) => {
      console.error("Error fetching summaries:", event.target.error);
    };

    getAllRequest.onsuccess = (event) => {
      const summaries = event.target.result;
      const filteredSummaries = summaries.filter(summary => 
        summary.title.toLowerCase().includes(query.toLowerCase()) ||
        summary.summary.toLowerCase().includes(query.toLowerCase()) ||
        summary.url.toLowerCase().includes(query.toLowerCase())
      );
      renderSummaries(filteredSummaries);
    };
  };
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  fetchSummaries();

  document.getElementById('search').addEventListener('input', (e) => {
    filterSummaries(e.target.value);
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all summaries?')) {
      clearAllSummaries();
    }
  });

  document.getElementById('reload').addEventListener('click', () => {
    const activeTab = getCurrentTab(); // Function to get the current tab URL
    if (activeTab) {
      chrome.runtime.sendMessage({
        action: "summarize",
        text: "", // Pass the full text of the webpage
        url: activeTab.url,
        title: activeTab.title,
        forceReload: true
      }, (response) => {
        if (response.error) {
          console.error("Error reloading summary:", response.error);
        } else {
          fetchSummaries(); // Refresh summaries to show the new summary
        }
      });
    }
  });
});

function getCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        reject("No active tab found");
      } else {
        resolve(tabs[0]);
      }
    });
  });
}
