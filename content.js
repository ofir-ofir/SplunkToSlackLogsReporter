// Variables to store the current state
let selectedLogs = [];

// Initialize the extension UI
function initializeUI() {
    // Create a floating action button for the extension
    const actionButton = document.createElement('div');
    actionButton.id = 'splunk-to-slack-button';
    actionButton.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #293035;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      z-index: 9999;
    ">
      <span style="font-size: 24px;"><img src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/306_Slack_logo-512.png" height="24" width="24" alt="Slack"></span>
    </div>
  `;
    document.body.appendChild(actionButton);

    // Create a panel to show selected logs
    const selectionPanel = document.createElement('div');
    selectionPanel.id = 'splunk-to-slack-panel';
    selectionPanel.innerHTML = `
    <div style="
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background-color: #293035;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      display: none;
      padding: 15px;
      overflow-y: auto;
    ">
      <h3 style="margin-top: 0;">Selected Logs</h3>
      <div id="splunk-to-slack-log-list"></div>
      <div style="margin-top: 15px;">
        <button id="splunk-to-slack-send" style="
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
        ">Send to Slack</button>
        <button id="splunk-to-slack-clear" style="
          background-color: #f44336;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 10px;
        ">Clear</button>
      </div>
    </div>
  `;
    document.body.appendChild(selectionPanel);

    // Toggle panel visibility when action button is clicked
    document.getElementById('splunk-to-slack-button').addEventListener('click', function() {
        const panel = document.getElementById('splunk-to-slack-panel').firstElementChild;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        updatePanelLogList();
    });

    // Add send button functionality
    document.getElementById('splunk-to-slack-send').addEventListener('click', function() {
        if (selectedLogs.length === 0) {
            alert('No logs selected');
            return;
        }

        chrome.runtime.sendMessage({
            action: 'sendToSlack',
            logs: selectedLogs
        }, function(response) {});

        selectedLogs = [];
        updatePanelLogList();
        setAllEventsNotSelected();
    });

    // Add clear button functionality
    document.getElementById('splunk-to-slack-clear').addEventListener('click', function() {
        selectedLogs = [];
        updatePanelLogList();
        setAllEventsNotSelected();
    });

    // Add log selection functionality to Splunk events
    addSelectionToEvents();
}

// Add selection functionality to Splunk events
function addSelectionToEvents() {
    // This function will depend on Splunk's DOM structure
    // We'll need to find and modify the event elements

    // Observer to detect new events being loaded
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                processNewEvents();
            }
        });
    });

    // Start observing the event container
    const targetNode = document.querySelector('.events-viewer') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

    // Initial processing of existing events
    processNewEvents();
}

// Process newly added events
function processNewEvents() {
    // Select all event elements that don't have our button yet
    // This selector will need to be adjusted based on Splunk's actual DOM structure
    const eventElements = document.querySelectorAll('.event:not([data-slack-button-added])');

    eventElements.forEach(function(eventElement) {
        // Mark this element as processed
        eventElement.setAttribute('data-slack-button-added', 'true');

        // Create select button
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Send to Slack';
        selectButton.className = 'splunk-to-slack-select-btn';
        selectButton.style.cssText = `
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-left: 10px;
    `;

        // Add click event to select this log
        selectButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (selectButton.textContent === 'Selected!') {
                return;
            }

            const timestampElement = eventElement.querySelector('span.t.string[data-path="timestamp"]');
            const artifactNameElement = eventElement.querySelector('span.t.string[data-path="artifactName"]');
            const levelElement = eventElement.querySelector('span.t.string[data-path="level"]');

            const log = {
                time: timestampElement ? timestampElement.textContent.trim() : 'Unknown',
                artifactName: artifactNameElement ? artifactNameElement.textContent.trim() : 'Unknown',
                level: levelElement ? levelElement.textContent.trim() : 'Unknown',
                splunkUrl: window.location.href
            };

            selectedLogs.push(log);

            updatePanelLogList();

            selectButton.textContent = 'Selected!';
        });

        eventElement.appendChild(selectButton);
    });
}

function updatePanelLogList() {
    const logList = document.getElementById('splunk-to-slack-log-list');

    if (selectedLogs.length === 0) {
        logList.innerHTML = '<p>No logs selected</p>';
        return;
    }

    let html = '<ul style="list-style-type: none; padding: 0; margin: 0;">';
    selectedLogs.forEach((log, index) => {
        html += `
      <li style="margin-bottom: 10px; padding: 8px; background-color: #3d3d3d; border-radius: 4px;">
        <div><strong>Time:</strong> ${log.time}</div>
        <div><strong>Artifact:</strong> ${log.artifactName}</div>
        <div><strong>Level:</strong> ${log.level}</div>
      </li>
    `;
    });
    html += '</ul>';

    logList.innerHTML = html;
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

function setAllEventsNotSelected() {
    const eventElements = document.querySelectorAll('.event');
    eventElements.forEach(function (eventElement) {
        const selectButton = eventElement.querySelector('.splunk-to-slack-select-btn');
        if (selectButton.className === 'splunk-to-slack-select-btn') {
            selectButton.textContent = 'Send to Slack';
        }
    });
}