// Debounce function (remains the same)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Function to create and show tooltip
function showTooltip(element, summary, url, title) {
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = 'black';
  tooltip.style.color = 'rgba(255, 255, 255, 0.8)';
  tooltip.style.border = '1px solid rgba(255, 255, 255, 0.3)';
  tooltip.style.padding = '10px';
  tooltip.style.zIndex = '10000';
  tooltip.style.maxWidth = '300px';
  tooltip.style.borderRadius = '5px';
  tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  tooltip.style.fontSize = '14px';
  tooltip.style.lineHeight = '1.4';

  const summaryElement = document.createElement('p');
  summaryElement.textContent = summary;
  summaryElement.style.margin = '0 0 10px 0';

  const reloadButton = document.createElement('button');
  reloadButton.textContent = '🔄 Reload';
  reloadButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  reloadButton.style.color = 'white';
  reloadButton.style.border = 'none';
  reloadButton.style.padding = '5px 10px';
  reloadButton.style.borderRadius = '3px';
  reloadButton.style.cursor = 'pointer';
  reloadButton.addEventListener('click', () => reloadSummary(url, title, summaryElement, reloadButton));

  tooltip.appendChild(summaryElement);
  tooltip.appendChild(reloadButton);

  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY}px`;

  document.body.appendChild(tooltip);
  return tooltip;
}

// Function to reload summary (remains the same)
function reloadSummary(url, title, summaryElement, reloadButton) {
  reloadButton.disabled = true;
  reloadButton.textContent = 'Loading...';
  
  if (isExtensionValid()) {
    try {
      chrome.runtime.sendMessage({ action: "summarize", url: url, title: title, text: url, forceReload: true }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          summaryElement.textContent = "Error reloading summary. Please try again.";
        } else if (response && response.summary) {
          summaryElement.textContent = response.summary;
        }
        reloadButton.disabled = false;
        reloadButton.textContent = '🔄 Reload';
      });
    } catch (error) {
      console.error("Error sending message:", error);
      summaryElement.textContent = "Error reloading summary. Please try again.";
      reloadButton.disabled = false;
      reloadButton.textContent = '🔄 Reload';
    }
  } else {
    console.warn("Extension context invalidated. Please refresh the page.");
    summaryElement.textContent = "Extension context invalidated. Please refresh the page.";
    reloadButton.disabled = false;
    reloadButton.textContent = '🔄 Reload';
  }
}

// Function to check if extension is still valid (remains the same)
function isExtensionValid() {
  return chrome.runtime && !!chrome.runtime.getManifest();
}

// Function to handle link hover and 'S' key press
const handleLinkHover = debounce((event) => {
  const link = event.target.closest('a');
  if (!link) return;

  const url = link.href;
  const title = link.textContent || link.innerText;

  // Add event listener for 'S' key press
  const keyHandler = (keyEvent) => {
    if (keyEvent.key === 's' || keyEvent.key === 'S') {
      if (isExtensionValid()) {
        try {
          chrome.runtime.sendMessage({ action: "summarize", url: url, title: title, text: url }, (response) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError.message);
              return;
            }
            if (response && response.summary) {
              const tooltip = showTooltip(link, response.summary, url, title);
              
              // New event listeners to keep tooltip visible
              tooltip.addEventListener('mouseover', () => {
                clearTimeout(tooltip.hideTimeout);
              });

              tooltip.addEventListener('mouseleave', () => {
                tooltip.hideTimeout = setTimeout(() => tooltip.remove(), 300);
              });

              link.addEventListener('mouseleave', () => {
                tooltip.hideTimeout = setTimeout(() => tooltip.remove(), 300);
              });
            }
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      } else {
        console.warn("Extension context invalidated. Please refresh the page.");
      }

      // Remove keydown event listener after execution
      document.removeEventListener('keydown', keyHandler);
    }
  };

  // Add keydown event listener
  document.addEventListener('keydown', keyHandler);

  // Remove keydown event listener when the mouse leaves the link
  link.addEventListener('mouseleave', () => {
    document.removeEventListener('keydown', keyHandler);
  });
}, 300);

// Add event listener to document
document.addEventListener('mouseover', handleLinkHover);

// Listen for extension updates (remains the same)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extension_updated") {
    console.log("Extension updated. Please refresh the page for changes to take effect.");
  }
});
