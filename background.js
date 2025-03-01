chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'sendToSlack') {
        try {
            console.log(message)
            let response = await sendLogsToSlack(message.logs);
            sendResponse(response);
        } catch (error) {
            sendResponse({ success: false, error: error.message })
        }
        return true; // Required for async sendResponse
    }
});

async function sendLogsToSlack(logs) {
    try {
        console.log("Sending logs to Slack:", logs);

        const payload = {
            text: `*Splunk Log Report*\n${logs.length} log(s) detected`,
            attachments: logs.map(log => ({
                color: log.level === 'error' ? '#FF0000' : '#36a64f',
                fields: [
                    { title: "Artifact", value: log.artifactName || "Unknown", short: true },
                    { title: "Level", value: log.level || "Unknown", short: true },
                    { title: "Timestamp", value: log.time, short: true },
                    { title: "Splunk Url", value: log.splunkUrl || "Unknown", short: true },
                ]
            }))
        };

        const response = await fetch(`https://hooks.slack.com/services/<slack-app-id>`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Get response body as text for better error logging
        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(`Slack API error: ${response.status} - ${responseText}`);
        }

        return { success: true };
    } catch (error) {
        console.log("Error sending to Slack:", error);
        return { success: false, error: error.message };
    }
}