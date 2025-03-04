//var SCRIPT_ID = 'AKfycbyBp-1TkWs1VLT6lrsmoLBG-r_1e_2wiMwSuV3JUyy85iFCk3VX6Cb8uqh2R_1iVNk';
var SCRIPT_ID = 'AKfycbzq_RL9k-na3leGNx-z9Ua3aitHSYN7z8wBmOIzrtZn0eFuzW3Ah-1gsPzMiOOzZgc';


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "submitForm") {
      submitFormResponse(message.answer)
          .then(response => sendResponse({ success: true, data: response }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

function submitFormResponse(answers) {
    console.log(answers);
  return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true, enableGranularPermissions: true}, (token) => {
          if (chrome.runtime.lastError) {
              console.error("Auth error:", chrome.runtime.lastError.message);
              reject(new Error("Authentication failed"));
              return;
          }

          console.log('Got OAuth Token: ' + token);

          fetch(`https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run`, {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  function: "callScript",
                  parameters: [answers ?? []]
              })
          })
          .then(response => response.json())
          .then(data => {
            console.log("API Response:", data);
            console.log("API Response (JSON):", JSON.stringify(data, null, 2));
              if (data.error) {
                  console.error("Script error:", data.error.details);
                  reject(new Error("Script execution failed"));
              } else {
                  console.log("Form submission success:", data);
                  resolve(data);
              }
          })
          .catch(error => {
              console.error("Network error:", error);
              reject(error);
          });
      });
  });
}

/*
,
                  parameters: [answers]
*/