(async function () {
    const domain = window.location.hostname;
    chrome.runtime.sendMessage({ type: "getPassword", domain }, (res) => {
        if (!res || !res.password) return;
        const inputs = document.querySelectorAll("input[type='password']");
        if (inputs.length) {
            inputs[0].value = res.password;
        }
    });
})();
