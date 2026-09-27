document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // GLOBAL HELPERS
    // ============================================================

    const $ = (id) => document.getElementById(id);

    function showLoading(message = "Processing...") {
        const overlay = $("loadingOverlay");
        const loadingText = $("loadingText");

        if (loadingText) {
            loadingText.textContent = message;
        }

        if (overlay) {
            overlay.style.display = "flex";
        }
    }

    function hideLoading() {
        const overlay = $("loadingOverlay");

        if (overlay) {
            overlay.style.display = "none";
        }
    }

    function showToast(message) {
        const toast = $("toast");
        const toastMessage = $("toastMessage");

        if (!toast || !toastMessage) {
            alert(message);
            return;
        }

        toastMessage.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    async function getJSON(response) {
        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            throw new Error(
                `Server returned an unexpected response (${response.status}).`
            );
        }

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.error || `Request failed (${response.status}).`
            );
        }

        return data;
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function copyText(text) {
        if (!text) {
            showToast("Nothing to copy.");
            return;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast("Copied successfully!");
                })
                .catch(() => {
                    fallbackCopy(text);
                });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea =
            document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            showToast("Copied successfully!");
        } catch (error) {
            showToast("Unable to copy text.");
        }

        textarea.remove();
    }


    // ============================================================
    // SPEECH LANGUAGE
    // ============================================================

    function getSpeechLanguage(code) {

        const languages = {
            en: "en-US",
            hi: "hi-IN",
            kn: "kn-IN",
            te: "te-IN",
            ta: "ta-IN",
            ml: "ml-IN",
            mr: "mr-IN",
            bn: "bn-IN",
            gu: "gu-IN",
            pa: "pa-IN",
            or: "or-IN",
            as: "as-IN",
            ur: "ur-PK",
            ne: "ne-NP",
            sa: "hi-IN",

            ja: "ja-JP",
            "zh-CN": "zh-CN",
            ko: "ko-KR",

            es: "es-ES",
            fr: "fr-FR",
            de: "de-DE",
            it: "it-IT",
            pt: "pt-PT",
            ru: "ru-RU",
            ar: "ar-SA",
            tr: "tr-TR",
            nl: "nl-NL",
            th: "th-TH",
            vi: "vi-VN"
        };

        return languages[code] || "en-US";
    }


    // ============================================================
    // SPEECH SYNTHESIS
    // ============================================================

    function speakText(text, language) {

        if (!text) {
            showToast("Nothing to listen to.");
            return;
        }

        if (!("speechSynthesis" in window)) {
            showToast(
                "Speech synthesis is not supported by this browser."
            );
            return;
        }

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(text);

        utterance.lang =
            language || "en-US";

        utterance.rate = 0.9;
        utterance.pitch = 1;

        window.speechSynthesis.speak(
            utterance
        );
    }


    // ============================================================
    // TAB NAVIGATION
    // ============================================================

    const translatorTab = $("translatorTab");
    const conversationTab = $("conversationTab");
    const imageTab = $("imageTab");
    const voiceTab = $("voiceTab");

    const translatorSection = $("translatorSection");
    const conversationSection = $("conversationSection");
    const imageSection = $("imageSection");
    const voiceSection = $("voiceSection");

    function activateSection(section, tab) {

        const sections = [
            translatorSection,
            conversationSection,
            imageSection,
            voiceSection
        ];

        const tabs = [
            translatorTab,
            conversationTab,
            imageTab,
            voiceTab
        ];

        sections.forEach((item) => {

            if (item) {
                item.classList.remove(
                    "active-section"
                );
            }

        });

        tabs.forEach((item) => {

            if (item) {
                item.classList.remove(
                    "active"
                );
            }

        });

        if (section) {
            section.classList.add(
                "active-section"
            );
        }

        if (tab) {
            tab.classList.add("active");
        }
    }

    if (translatorTab) {

        translatorTab.addEventListener(
            "click",
            () => {
                activateSection(
                    translatorSection,
                    translatorTab
                );
            }
        );

    }

    if (conversationTab) {

        conversationTab.addEventListener(
            "click",
            () => {
                activateSection(
                    conversationSection,
                    conversationTab
                );
            }
        );

    }

    if (imageTab) {

        imageTab.addEventListener(
            "click",
            () => {
                activateSection(
                    imageSection,
                    imageTab
                );
            }
        );

    }

    if (voiceTab) {

        voiceTab.addEventListener(
            "click",
            () => {
                activateSection(
                    voiceSection,
                    voiceTab
                );
            }
        );

    }


    // ============================================================
    // HISTORY
    // ============================================================

    function saveToHistory(item) {

        try {

            const history =
                JSON.parse(
                    localStorage.getItem(
                        "linguaaiHistory"
                    ) || "[]"
                );

            history.unshift({
                ...item,
                date: new Date().toLocaleString()
            });

            localStorage.setItem(
                "linguaaiHistory",
                JSON.stringify(
                    history.slice(0, 50)
                )
            );

        } catch (error) {

            console.error(
                "History save error:",
                error
            );

        }
    }

    function loadHistory() {

        const list = $("historyList");

        if (!list) {
            return;
        }

        let history = [];

        try {

            history =
                JSON.parse(
                    localStorage.getItem(
                        "linguaaiHistory"
                    ) || "[]"
                );

        } catch (error) {

            history = [];

        }

        if (!history.length) {

            list.innerHTML = `
                <p class="empty-message">
                    No translation history yet.
                </p>
            `;

            return;
        }

        list.innerHTML = "";

        history.forEach((item) => {

            const card =
                document.createElement("div");

            card.className =
                "history-item";

            card.innerHTML = `
                <div class="history-languages">
                    ${escapeHTML(
                        item.sourceLanguage || "auto"
                    )}
                    →
                    ${escapeHTML(
                        item.targetLanguage || "en"
                    )}
                </div>

                <div class="history-source">
                    ${escapeHTML(
                        item.sourceText || ""
                    )}
                </div>

                <div class="history-translation">
                    ${escapeHTML(
                        item.translation || ""
                    )}
                </div>

                <small>
                    ${escapeHTML(
                        item.date || ""
                    )}
                </small>
            `;

            list.appendChild(card);
        });
    }


    // ============================================================
    // FAVORITES
    // ============================================================

    function loadFavorites() {

        const list =
            $("favoritesList");

        if (!list) {
            return;
        }

        let favorites = [];

        try {

            favorites =
                JSON.parse(
                    localStorage.getItem(
                        "linguaaiFavorites"
                    ) || "[]"
                );

        } catch (error) {

            favorites = [];

        }

        if (!favorites.length) {

            list.innerHTML = `
                <p class="empty-message">
                    No favorite translations yet.
                </p>
            `;

            return;
        }

        list.innerHTML = "";

        favorites.forEach((item) => {

            const card =
                document.createElement("div");

            card.className =
                "history-item";

            card.innerHTML = `
                <div class="history-languages">
                    ${escapeHTML(
                        item.sourceLanguage || "auto"
                    )}
                    →
                    ${escapeHTML(
                        item.targetLanguage || "en"
                    )}
                </div>

                <div class="history-source">
                    ${escapeHTML(
                        item.sourceText || ""
                    )}
                </div>

                <div class="history-translation">
                    ${escapeHTML(
                        item.translation || ""
                    )}
                </div>

                <small>
                    ${escapeHTML(
                        item.date || ""
                    )}
                </small>
            `;

            list.appendChild(card);
        });
    }


    // ============================================================
    // NORMAL TEXT TRANSLATION
    // ============================================================

    const sourceText =
        $("sourceText");

    const sourceLanguage =
        $("sourceLanguage");

    const targetLanguage =
        $("targetLanguage");

    const translateBtn =
        $("translateBtn");

    const translationOutput =
        $("translationOutput");

    const inputCounter =
        $("inputCounter");

    const translationLanguage =
        $("translationLanguage");

    const emotionResult =
        $("emotionResult");


    function updateCharacterCounter() {

        if (!sourceText || !inputCounter) {
            return;
        }

        const count =
            sourceText.value.length;

        inputCounter.textContent =
            `${count} character${count === 1 ? "" : "s"}`;
    }


    async function translateNormalText() {

        if (
            !sourceText ||
            !sourceLanguage ||
            !targetLanguage
        ) {
            return;
        }

        const text =
            sourceText.value.trim();

        const source =
            sourceLanguage.value;

        const target =
            targetLanguage.value;

        if (!text) {

            showToast(
                "Please enter some text."
            );

            sourceText.focus();

            return;
        }

        showLoading(
            "Translating..."
        );

        try {

            const response =
                await fetch(
                    "/translate",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            text: text,
                            source: source,
                            target: target
                        })
                    }
                );

            const data =
                await getJSON(response);

            if (translationOutput) {

                translationOutput.textContent =
                    data.translation || "";

            }

            if (
                translationLanguage &&
                targetLanguage
            ) {

                translationLanguage.textContent =
                    targetLanguage.options[
                        targetLanguage.selectedIndex
                    ].text;

            }

            if (emotionResult) {

                emotionResult.textContent =
                    data.emotion || "Neutral";

            }

            saveToHistory({

                type: "text",

                sourceLanguage:
                    data.source || source,

                targetLanguage:
                    data.target || target,

                sourceText:
                    text,

                translation:
                    data.translation || ""

            });

            showToast(
                "Translation completed!"
            );

        } catch (error) {

            console.error(
                "Normal translation error:",
                error
            );

            if (translationOutput) {

                translationOutput.textContent =
                    error.message;

            }

            showToast(
                error.message
            );

        } finally {

            hideLoading();

        }
    }


    if (translateBtn) {

        translateBtn.addEventListener(
            "click",
            translateNormalText
        );

    }


    if (sourceText) {

        sourceText.addEventListener(
            "input",
            updateCharacterCounter
        );

        sourceText.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    (event.ctrlKey ||
                        event.metaKey)
                ) {

                    event.preventDefault();

                    translateNormalText();

                }

            }
        );

        updateCharacterCounter();
    }


    // ============================================================
    // NORMAL CLEAR
    // ============================================================

    const clearBtn =
        $("clearBtn");

    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            () => {

                if (sourceText) {
                    sourceText.value = "";
                }

                if (translationOutput) {

                    translationOutput.innerHTML = `
                        <span class="output-placeholder">
                            Your translation will appear here...
                        </span>
                    `;

                }

                if (emotionResult) {
                    emotionResult.textContent =
                        "Neutral";
                }

                updateCharacterCounter();

                showToast(
                    "Text cleared."
                );

            }
        );

    }


    // ============================================================
    // NORMAL COPY
    // ============================================================

    const copyBtn =
        $("copyBtn");

    if (copyBtn) {

        copyBtn.addEventListener(
            "click",
            () => {

                const text =
                    translationOutput?.textContent.trim() ||
                    "";

                copyText(text);

            }
        );

    }


    // ============================================================
    // NORMAL LISTEN
    // ============================================================

    const listenBtn =
        $("listenBtn");

    if (listenBtn) {

        listenBtn.addEventListener(
            "click",
            () => {

                const text =
                    translationOutput?.textContent.trim() ||
                    "";

                const language =
                    targetLanguage?.value ||
                    "en";

                speakText(
                    text,
                    getSpeechLanguage(
                        language
                    )
                );

            }
        );

    }


    // ============================================================
    // NORMAL FAVORITE
    // ============================================================

    const favoriteBtn =
        $("favoriteBtn");

    if (favoriteBtn) {

        favoriteBtn.addEventListener(
            "click",
            () => {

                const input =
                    sourceText?.value.trim() ||
                    "";

                const translation =
                    translationOutput?.textContent.trim() ||
                    "";

                if (
                    !input ||
                    !translation ||
                    translation.includes(
                        "Your translation will appear here"
                    )
                ) {

                    showToast(
                        "Translate something before saving."
                    );

                    return;
                }

                let favorites = [];

                try {

                    favorites =
                        JSON.parse(
                            localStorage.getItem(
                                "linguaaiFavorites"
                            ) || "[]"
                        );

                } catch (error) {

                    favorites = [];

                }

                favorites.unshift({

                    sourceLanguage:
                        sourceLanguage?.value ||
                        "auto",

                    targetLanguage:
                        targetLanguage?.value ||
                        "en",

                    sourceText:
                        input,

                    translation:
                        translation,

                    date:
                        new Date().toLocaleString()

                });

                localStorage.setItem(
                    "linguaaiFavorites",
                    JSON.stringify(
                        favorites.slice(0, 50)
                    )
                );

                showToast(
                    "Saved to Favorites."
                );

            }
        );

    }


    // ============================================================
    // LANGUAGE DETECTION
    // ============================================================

    const detectLanguageBtn =
        $("detectLanguageBtn");

    const detectionStatus =
        $("detectionStatus");

    if (detectLanguageBtn) {

        detectLanguageBtn.addEventListener(
            "click",
            async () => {

                const text =
                    sourceText?.value.trim() ||
                    "";

                if (!text) {

                    showToast(
                        "Enter text first."
                    );

                    return;
                }

                showLoading(
                    "Detecting language..."
                );

                try {

                    const response =
                        await fetch(
                            "/detect-language",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    text: text
                                })
                            }
                        );

                    const data =
                        await getJSON(response);

                    if (detectionStatus) {

                        detectionStatus.textContent =
                            `Detected: ${data.language}`;

                    }

                    if (
                        sourceLanguage &&
                        data.language_code
                    ) {

                        const option =
                            Array.from(
                                sourceLanguage.options
                            ).find(
                                (item) =>
                                    item.value.toLowerCase() ===
                                    data.language_code.toLowerCase()
                            );

                        if (option) {

                            sourceLanguage.value =
                                option.value;

                        }

                    }

                    showToast(
                        `Detected language: ${data.language}`
                    );

                } catch (error) {

                    console.error(
                        "Detection error:",
                        error
                    );

                    showToast(
                        error.message
                    );

                } finally {

                    hideLoading();

                }

            }
        );

    }


    // ============================================================
    // NORMAL LANGUAGE SWAP
    // ============================================================

    const swapLanguages =
        $("swapLanguages");

    if (swapLanguages) {

        swapLanguages.addEventListener(
            "click",
            () => {

                if (
                    !sourceLanguage ||
                    !targetLanguage
                ) {
                    return;
                }

                if (
                    sourceLanguage.value ===
                    "auto"
                ) {

                    showToast(
                        "Detect the source language before swapping."
                    );

                    return;
                }

                const oldSource =
                    sourceLanguage.value;

                sourceLanguage.value =
                    targetLanguage.value;

                targetLanguage.value =
                    oldSource;

                if (
                    sourceText &&
                    translationOutput
                ) {

                    const translated =
                        translationOutput.textContent.trim();

                    if (
                        translated &&
                        !translated.includes(
                            "Your translation will appear here"
                        )
                    ) {

                        sourceText.value =
                            translated;

                        translationOutput.innerHTML = `
                            <span class="output-placeholder">
                                Your translation will appear here...
                            </span>
                        `;

                        updateCharacterCounter();

                    }

                }

                showToast(
                    "Languages swapped."
                );

            }
        );

    }


    // ============================================================
    // CONVERSATION MODE
    // ============================================================

    const conversationSource =
        $("conversationSource");

    const conversationTarget =
        $("conversationTarget");

    const conversationText =
        $("conversationText");

    const conversationOutput =
        $("conversationOutput");

    const conversationTranslateBtn =
        $("conversationTranslateBtn");

    const conversationVoiceBtn =
        $("conversationVoiceBtn");

    const conversationCopyBtn =
        $("conversationCopyBtn");

    const conversationListenBtn =
        $("conversationListenBtn");


    // ============================================================
    // B → A ELEMENTS
    // ============================================================

    const conversationBText =
        $("conversationBText");

    const conversationBOutput =
        $("conversationBOutput");

    const conversationBTranslateBtn =
        $("conversationBTranslateBtn");

    const conversationBVoiceBtn =
        $("conversationBVoiceBtn");

    const conversationBCopyBtn =
        $("conversationBCopyBtn");

    const conversationBListenBtn =
        $("conversationBListenBtn");


    // ============================================================
    // CONVERSATION LANGUAGE LABELS
    // ============================================================

    const personALanguage =
        $("personALanguage");

    const personBLanguage =
        $("personBLanguage");

    const personBLanguageInput =
        $("personBLanguageInput");

    const personALanguageOutput =
        $("personALanguageOutput");

    const culturalTip =
        $("culturalTip");


    function getSelectedLanguageName(selectElement) {

        if (
            !selectElement ||
            selectElement.selectedIndex < 0
        ) {
            return "";
        }

        return selectElement.options[
            selectElement.selectedIndex
        ].text;
    }


    function updateConversationLabels() {

        const sourceName =
            getSelectedLanguageName(
                conversationSource
            );

        const targetName =
            getSelectedLanguageName(
                conversationTarget
            );


        // A → B heading

        if (personALanguage) {

            personALanguage.textContent =
                `${sourceName} → ${targetName}`;

        }


        // B → A heading

        if (personBLanguageInput) {

            personBLanguageInput.textContent =
                `${targetName} → ${sourceName}`;

        }


        // A → B output

        if (personBLanguage) {

            personBLanguage.textContent =
                targetName;

        }


        // B → A output

        if (personALanguageOutput) {

            personALanguageOutput.textContent =
                sourceName;

        }

    }


    if (conversationSource) {

        conversationSource.addEventListener(
            "change",
            updateConversationLabels
        );

    }

    if (conversationTarget) {

        conversationTarget.addEventListener(
            "change",
            updateConversationLabels
        );

    }

    updateConversationLabels();


    // ============================================================
    // COMMON CONVERSATION TRANSLATION FUNCTION
    // ============================================================

    async function sendConversationTranslation(
        text,
        source,
        target
    ) {

        const response =
            await fetch(
                "/conversation-translate",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text: text,

                        source: source,

                        target: target

                    })
                }
            );

        return await getJSON(response);
    }


    // ============================================================
    // A → B TRANSLATION
    // ============================================================

    async function translateAtoB() {

        if (
            !conversationText ||
            !conversationSource ||
            !conversationTarget
        ) {
            showToast(
                "Conversation elements are missing."
            );

            return;
        }

        const text =
            conversationText.value.trim();

        const source =
            conversationSource.value;

        const target =
            conversationTarget.value;


        if (!text) {

            showToast(
                "Enter a message for Person A."
            );

            conversationText.focus();

            return;
        }


        if (source === target) {

            showToast(
                "Person A and Person B languages must be different."
            );

            return;
        }


        showLoading(
            "Translating Person A → Person B..."
        );


        try {

            const data =
                await sendConversationTranslation(
                    text,
                    source,
                    target
                );


            if (conversationOutput) {

                conversationOutput.textContent =
                    data.translation || "";

            }


            if (culturalTip) {

                culturalTip.textContent =
                    data.cultural_tip ||
                    "Cultural information will appear here.";

            }


            saveToHistory({

                type:
                    "conversation A to B",

                sourceLanguage:
                    source,

                targetLanguage:
                    target,

                sourceText:
                    text,

                translation:
                    data.translation || ""

            });


            showToast(
                "Person A → Person B translated!"
            );


        } catch (error) {

            console.error(
                "A → B translation error:",
                error
            );

            if (conversationOutput) {

                conversationOutput.textContent =
                    "Translation failed: " +
                    error.message;

            }

            showToast(
                error.message
            );


        } finally {

            hideLoading();

        }
    }


    // ============================================================
    // B → A TRANSLATION
    // THIS IS THE IMPORTANT FIX
    // ============================================================

    async function translateBtoA() {

        if (
            !conversationBText ||
            !conversationSource ||
            !conversationTarget
        ) {

            showToast(
                "B → A conversation elements are missing."
            );

            return;
        }


        // Read text from Person B textbox

        const text =
            conversationBText.value.trim();


        // IMPORTANT:
        // Person B language is conversationTarget

        const source =
            conversationTarget.value;


        // Person A language is conversationSource

        const target =
            conversationSource.value;


        console.log(
            "B → A Request:",
            {
                text: text,
                source: source,
                target: target
            }
        );


        if (!text) {

            showToast(
                "Enter a message for Person B."
            );

            conversationBText.focus();

            return;
        }


        if (source === target) {

            showToast(
                "Person A and Person B languages must be different."
            );

            return;
        }


        showLoading(
            "Translating Person B → Person A..."
        );


        try {

            // Send B language as SOURCE
            // Send A language as TARGET

            const data =
                await sendConversationTranslation(
                    text,
                    source,
                    target
                );


            console.log(
                "B → A Response:",
                data
            );


            // Put translation into B → A output

            if (conversationBOutput) {

                conversationBOutput.textContent =
                    data.translation || "";

            }


            // Update cultural tip

            if (culturalTip) {

                culturalTip.textContent =
                    data.cultural_tip ||
                    "Cultural information will appear here.";

            }


            // Save B → A to history

            saveToHistory({

                type:
                    "conversation B to A",

                sourceLanguage:
                    source,

                targetLanguage:
                    target,

                sourceText:
                    text,

                translation:
                    data.translation || ""

            });


            showToast(
                "Person B → Person A translated!"
            );


        } catch (error) {

            console.error(
                "B → A translation error:",
                error
            );


            if (conversationBOutput) {

                conversationBOutput.textContent =
                    "Translation failed: " +
                    error.message;

            }


            showToast(
                error.message
            );


        } finally {

            hideLoading();

        }

    }


    // ============================================================
    // A → B BUTTON
    // ============================================================

    if (conversationTranslateBtn) {

        conversationTranslateBtn.addEventListener(
            "click",
            translateAtoB
        );

    }


    // ============================================================
    // B → A BUTTON
    // ============================================================

    if (conversationBTranslateBtn) {

        conversationBTranslateBtn.addEventListener(
            "click",
            translateBtoA
        );

    }


    // ============================================================
    // CONVERSATION SWAP
    // ============================================================

    const conversationSwapBtn =
        $("conversationSwapBtn");

    if (conversationSwapBtn) {

        conversationSwapBtn.addEventListener(
            "click",
            () => {

                if (
                    !conversationSource ||
                    !conversationTarget
                ) {
                    return;
                }


                const oldSource =
                    conversationSource.value;


                conversationSource.value =
                    conversationTarget.value;


                conversationTarget.value =
                    oldSource;


                updateConversationLabels();


                // Clear both outputs

                if (conversationOutput) {

                    conversationOutput.textContent =
                        "Person B translation will appear here...";

                }


                if (conversationBOutput) {

                    conversationBOutput.textContent =
                        "Person A translation will appear here...";

                }


                showToast(
                    "Conversation direction swapped."
                );

            }
        );

    }


    // ============================================================
    // A → B COPY
    // ============================================================

    if (conversationCopyBtn) {

        conversationCopyBtn.addEventListener(
            "click",
            () => {

                const text =
                    conversationOutput?.textContent.trim() ||
                    "";

                if (
                    text.includes(
                        "Person B translation will appear here"
                    )
                ) {

                    showToast(
                        "Translate A → B first."
                    );

                    return;
                }

                copyText(text);

            }
        );

    }


    // ============================================================
    // B → A COPY
    // ============================================================

    if (conversationBCopyBtn) {

        conversationBCopyBtn.addEventListener(
            "click",
            () => {

                const text =
                    conversationBOutput?.textContent.trim() ||
                    "";

                if (
                    text.includes(
                        "Person A translation will appear here"
                    )
                ) {

                    showToast(
                        "Translate B → A first."
                    );

                    return;
                }

                copyText(text);

            }
        );

    }


    // ============================================================
    // A → B LISTEN
    // ============================================================

    if (conversationListenBtn) {

        conversationListenBtn.addEventListener(
            "click",
            () => {

                const text =
                    conversationOutput?.textContent.trim() ||
                    "";

                if (
                    text.includes(
                        "Person B translation will appear here"
                    )
                ) {

                    showToast(
                        "Translate A → B first."
                    );

                    return;
                }

                const language =
                    conversationTarget?.value ||
                    "en";

                speakText(
                    text,
                    getSpeechLanguage(
                        language
                    )
                );

            }
        );

    }


    // ============================================================
    // B → A LISTEN
    // ============================================================

    if (conversationBListenBtn) {

        conversationBListenBtn.addEventListener(
            "click",
            () => {

                const text =
                    conversationBOutput?.textContent.trim() ||
                    "";

                if (
                    text.includes(
                        "Person A translation will appear here"
                    )
                ) {

                    showToast(
                        "Translate B → A first."
                    );

                    return;
                }

                // IMPORTANT:
                // B → A output is in Person A language

                const language =
                    conversationSource?.value ||
                    "en";

                speakText(
                    text,
                    getSpeechLanguage(
                        language
                    )
                );

            }
        );

    }


    // ============================================================
    // CONVERSATION A VOICE
    // ============================================================

    if (conversationVoiceBtn) {

        conversationVoiceBtn.addEventListener(
            "click",
            () => {

                const language =
                    conversationSource?.value ||
                    "en";

                startSpeechRecognition(
                    language,
                    (text) => {

                        if (conversationText) {

                            conversationText.value =
                                text;

                        }

                    }
                );

            }
        );

    }


    // ============================================================
    // CONVERSATION B VOICE
    // ============================================================

    if (conversationBVoiceBtn) {

        conversationBVoiceBtn.addEventListener(
            "click",
            () => {

                // IMPORTANT:
                // Person B speaks in conversationTarget

                const language =
                    conversationTarget?.value ||
                    "en";

                startSpeechRecognition(
                    language,
                    (text) => {

                        if (conversationBText) {

                            conversationBText.value =
                                text;

                        }

                    }
                );

            }
        );

    }


    // ============================================================
    // ENTER KEY FOR A → B
    // ============================================================

    if (conversationText) {

        conversationText.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    (event.ctrlKey ||
                        event.metaKey)
                ) {

                    event.preventDefault();

                    translateAtoB();

                }

            }
        );

    }


    // ============================================================
    // ENTER KEY FOR B → A
    // ============================================================

    if (conversationBText) {

        conversationBText.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    (event.ctrlKey ||
                        event.metaKey)
                ) {

                    event.preventDefault();

                    translateBtoA();

                }

            }
        );

    }


    // ============================================================
    // IMAGE TRANSLATION
    // ============================================================

    const imageInput =
        $("imageInput");

    const imagePreview =
        $("imagePreview");

    const imagePreviewContainer =
        $("imagePreviewContainer");

    const selectedImageName =
        $("selectedImageName");

    const removeImageBtn =
        $("removeImageBtn");

    const imageTranslateBtn =
        $("imageTranslateBtn");

    const imageTargetLanguage =
        $("imageTargetLanguage");

    const imageResult =
        $("imageResult");

    const extractedText =
        $("extractedText");

    const imageTranslation =
        $("imageTranslation");


    // ============================================================
    // IMAGE PREVIEW
    // ============================================================

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            () => {

                const file =
                    imageInput.files[0];

                if (!file) {

                    if (selectedImageName) {

                        selectedImageName.textContent =
                            "No image selected";

                    }

                    return;
                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    showToast(
                        "Please select an image file."
                    );

                    imageInput.value = "";

                    return;
                }


                if (selectedImageName) {

                    selectedImageName.textContent =
                        file.name;

                }


                if (imagePreview) {

                    const reader =
                        new FileReader();

                    reader.onload =
                        (event) => {

                            imagePreview.src =
                                event.target.result;

                        };

                    reader.readAsDataURL(
                        file
                    );

                }


                if (imagePreviewContainer) {

                    imagePreviewContainer.style.display =
                        "block";

                }


                if (imageResult) {

                    imageResult.style.display =
                        "none";

                }

            }
        );

    }


    // ============================================================
    // REMOVE IMAGE
    // ============================================================

    if (removeImageBtn) {

        removeImageBtn.addEventListener(
            "click",
            () => {

                if (imageInput) {

                    imageInput.value =
                        "";

                }

                if (imagePreview) {

                    imagePreview.src =
                        "";

                }

                if (imagePreviewContainer) {

                    imagePreviewContainer.style.display =
                        "none";

                }

                if (selectedImageName) {

                    selectedImageName.textContent =
                        "No image selected";

                }

                if (imageResult) {

                    imageResult.style.display =
                        "none";

                }

                if (extractedText) {

                    extractedText.textContent =
                        "";

                }

                if (imageTranslation) {

                    imageTranslation.textContent =
                        "";

                }

            }
        );

    }


    // ============================================================
    // IMAGE OCR + TRANSLATION
    // ============================================================

    async function translateImage() {

        if (!imageInput) {
            return;
        }

        const file =
            imageInput.files[0];

        if (!file) {

            showToast(
                "Please choose an image first."
            );

            return;
        }


        const target =
            imageTargetLanguage?.value ||
            "en";


        const formData =
            new FormData();


        formData.append(
            "image",
            file
        );

        formData.append(
            "target",
            target
        );


        showLoading(
            "Reading image and translating..."
        );


        try {

            const response =
                await fetch(
                    "/image-translate",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await getJSON(response);


            if (extractedText) {

                extractedText.textContent =
                    data.extracted_text ||
                    "No text extracted.";

            }


            if (imageTranslation) {

                imageTranslation.textContent =
                    data.translation ||
                    "No translation available.";

            }


            if (imageResult) {

                imageResult.style.display =
                    "block";

            }


            saveToHistory({

                type:
                    "image",

                sourceLanguage:
                    data.detected_language ||
                    "auto",

                targetLanguage:
                    data.target_language ||
                    target,

                sourceText:
                    data.extracted_text ||
                    "",

                translation:
                    data.translation ||
                    ""

            });


            showToast(
                "Image translated successfully!"
            );


        } catch (error) {

            console.error(
                "Image translation error:",
                error
            );


            if (imageResult) {

                imageResult.style.display =
                    "block";

            }


            if (extractedText) {

                extractedText.textContent =
                    "Unable to extract readable text.";

            }


            if (imageTranslation) {

                imageTranslation.textContent =
                    error.message;

            }


            showToast(
                error.message
            );


        } finally {

            hideLoading();

        }

    }


    if (imageTranslateBtn) {

        imageTranslateBtn.addEventListener(
            "click",
            translateImage
        );

    }


    // ============================================================
    // VOICE TRANSLATION
    // ============================================================

    const voiceSourceLanguage =
        $("voiceSourceLanguage");

    const voiceTargetLanguage =
        $("voiceTargetLanguage");

    const startVoiceBtn =
        $("startVoiceBtn");

    const voiceStatus =
        $("voiceStatus");

    const voiceInputText =
        $("voiceInputText");

    const voiceTranslationText =
        $("voiceTranslationText");

    const voiceListenBtn =
        $("voiceListenBtn");

    const voiceCopyBtn =
        $("voiceCopyBtn");

    const voiceSwapBtn =
        $("voiceSwapBtn");


    // ============================================================
    // SPEECH RECOGNITION
    // ============================================================

    let recognition = null;


    function createRecognition(language) {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        if (!SpeechRecognition) {
            return null;
        }


        const recognizer =
            new SpeechRecognition();


        recognizer.lang =
            getSpeechLanguage(
                language
            );


        recognizer.continuous =
            false;


        recognizer.interimResults =
            false;


        recognizer.maxAlternatives =
            1;


        return recognizer;
    }


    function startSpeechRecognition(
        language,
        onResult
    ) {

        const recognizer =
            createRecognition(
                language
            );


        if (!recognizer) {

            showToast(
                "Voice recognition is not supported. Please use Google Chrome."
            );

            return;
        }


        if (recognition) {

            try {
                recognition.stop();
            } catch (error) {
                // Ignore
            }

        }


        recognition =
            recognizer;


        recognizer.onstart =
            () => {

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "Listening... Speak now.";

                }

                showToast(
                    "Listening..."
                );

            };


        recognizer.onresult =
            (event) => {

                const text =
                    event.results[0][0].transcript;


                console.log(
                    "Speech recognized:",
                    text
                );


                if (onResult) {

                    onResult(
                        text
                    );

                }

            };


        recognizer.onerror =
            (event) => {

                console.error(
                    "Speech recognition error:",
                    event.error
                );


                if (event.error === "not-allowed") {

                    showToast(
                        "Microphone permission was denied."
                    );

                } else {

                    showToast(
                        `Voice error: ${event.error}`
                    );

                }


                if (voiceStatus) {

                    voiceStatus.textContent =
                        "Voice recognition failed.";

                }

            };


        recognizer.onend =
            () => {

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "Click the microphone and speak.";

                }

            };


        try {

            recognizer.start();

        } catch (error) {

            console.error(
                "Recognition start error:",
                error
            );

        }

    }


    // ============================================================
    // VOICE SWAP
    // ============================================================

    if (voiceSwapBtn) {

        voiceSwapBtn.addEventListener(
            "click",
            () => {

                if (
                    !voiceSourceLanguage ||
                    !voiceTargetLanguage
                ) {
                    return;
                }


                const oldSource =
                    voiceSourceLanguage.value;


                voiceSourceLanguage.value =
                    voiceTargetLanguage.value;


                voiceTargetLanguage.value =
                    oldSource;


                showToast(
                    "Voice languages swapped."
                );

            }
        );

    }


    // ============================================================
    // VOICE TRANSLATION
    // ============================================================

    async function translateVoiceText(text) {

        const source =
            voiceSourceLanguage?.value ||
            "en";

        const target =
            voiceTargetLanguage?.value ||
            "en";


        if (!text) {
            return;
        }


        if (voiceInputText) {

            voiceInputText.textContent =
                text;

        }


        if (source === target) {

            if (voiceTranslationText) {

                voiceTranslationText.textContent =
                    text;

            }

            return;
        }


        showLoading(
            "Translating your voice..."
        );


        try {

            const response =
                await fetch(
                    "/translate",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            text:
                                text,

                            source:
                                source,

                            target:
                                target

                        })

                    }
                );


            const data =
                await getJSON(
                    response
                );


            if (voiceTranslationText) {

                voiceTranslationText.textContent =
                    data.translation || "";

            }


            saveToHistory({

                type:
                    "voice",

                sourceLanguage:
                    source,

                targetLanguage:
                    target,

                sourceText:
                    text,

                translation:
                    data.translation || ""

            });


            showToast(
                "Voice translation completed!"
            );


        } catch (error) {

            console.error(
                "Voice translation error:",
                error
            );


            if (voiceTranslationText) {

                voiceTranslationText.textContent =
                    "Translation failed: " +
                    error.message;

            }


            showToast(
                error.message
            );


        } finally {

            hideLoading();

        }

    }


    // ============================================================
    // START VOICE TRANSLATION
    // ============================================================

    if (startVoiceBtn) {

        startVoiceBtn.addEventListener(
            "click",
            () => {

                const language =
                    voiceSourceLanguage?.value ||
                    "en";


                startSpeechRecognition(
                    language,
                    (text) => {

                        translateVoiceText(
                            text
                        );

                    }
                );

            }
        );

    }


    // ============================================================
    // VOICE LISTEN
    // ============================================================

    if (voiceListenBtn) {

        voiceListenBtn.addEventListener(
            "click",
            () => {

                const text =
                    voiceTranslationText?.textContent.trim() ||
                    "";


                const language =
                    voiceTargetLanguage?.value ||
                    "en";


                speakText(
                    text,
                    getSpeechLanguage(
                        language
                    )
                );

            }
        );

    }


    // ============================================================
    // VOICE COPY
    // ============================================================

    if (voiceCopyBtn) {

        voiceCopyBtn.addEventListener(
            "click",
            () => {

                const text =
                    voiceTranslationText?.textContent.trim() ||
                    "";

                copyText(text);

            }
        );

    }


    // ============================================================
    // NORMAL TRANSLATOR VOICE INPUT
    // ============================================================

    const voiceInputBtn =
        $("voiceInputBtn");

    if (voiceInputBtn) {

        voiceInputBtn.addEventListener(
            "click",
            () => {

                let language =
                    sourceLanguage?.value ||
                    "en";


                // Browser speech recognition
                // cannot directly use "auto"

                if (language === "auto") {

                    language = "en";

                    showToast(
                        "Voice input uses English when Detect Language is selected."
                    );

                }


                startSpeechRecognition(
                    language,
                    (text) => {

                        if (sourceText) {

                            sourceText.value =
                                text;

                            updateCharacterCounter();

                        }

                    }
                );

            }
        );

    }


    // ============================================================
    // HISTORY BUTTON
    // ============================================================

    const historyBtn =
        $("historyBtn");

    const historyModal =
        $("historyModal");

    const closeHistoryBtn =
        $("closeHistoryBtn");

    if (historyBtn) {

        historyBtn.addEventListener(
            "click",
            () => {

                loadHistory();

                if (historyModal) {

                    historyModal.style.display =
                        "flex";

                }

            }
        );

    }


    if (closeHistoryBtn) {

        closeHistoryBtn.addEventListener(
            "click",
            () => {

                if (historyModal) {

                    historyModal.style.display =
                        "none";

                }

            }
        );

    }


    // ============================================================
    // FAVORITES BUTTON
    // ============================================================

    const favoritesBtn =
        $("favoritesBtn");

    const favoritesModal =
        $("favoritesModal");

    const closeFavoritesBtn =
        $("closeFavoritesBtn");

    if (favoritesBtn) {

        favoritesBtn.addEventListener(
            "click",
            () => {

                loadFavorites();

                if (favoritesModal) {

                    favoritesModal.style.display =
                        "flex";

                }

            }
        );

    }


    if (closeFavoritesBtn) {

        closeFavoritesBtn.addEventListener(
            "click",
            () => {

                if (favoritesModal) {

                    favoritesModal.style.display =
                        "none";

                }

            }
        );

    }


    // ============================================================
    // CLEAR HISTORY
    // ============================================================

    const clearHistoryBtn =
        $("clearHistoryBtn");

    if (clearHistoryBtn) {

        clearHistoryBtn.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "linguaaiHistory"
                );

                loadHistory();

                showToast(
                    "History cleared."
                );

            }
        );

    }


    // ============================================================
    // CLEAR FAVORITES
    // ============================================================

    const clearFavoritesBtn =
        $("clearFavoritesBtn");

    if (clearFavoritesBtn) {

        clearFavoritesBtn.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "linguaaiFavorites"
                );

                loadFavorites();

                showToast(
                    "Favorites cleared."
                );

            }
        );

    }


    // ============================================================
    // CLOSE MODALS BY CLICKING OUTSIDE
    // ============================================================

    window.addEventListener(
        "click",
        (event) => {

            if (
                historyModal &&
                event.target === historyModal
            ) {

                historyModal.style.display =
                    "none";

            }


            if (
                favoritesModal &&
                event.target === favoritesModal
            ) {

                favoritesModal.style.display =
                    "none";

            }

        }
    );


    // ============================================================
    // ESC KEY CLOSE MODALS
    // ============================================================

    window.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") {
                return;
            }

            if (historyModal) {

                historyModal.style.display =
                    "none";

            }

            if (favoritesModal) {

                favoritesModal.style.display =
                    "none";

            }

        }
    );


    // ============================================================
    // INITIAL SETUP
    // ============================================================

    updateCharacterCounter();
    updateConversationLabels();

    console.log(
        "=========================================="
    );

    console.log(
        "LinguaAI JavaScript loaded successfully."
    );

    console.log(
        "A → B conversation: READY"
    );

    console.log(
        "B → A conversation: READY"
    );

    console.log(
        "Image translation: READY"
    );

    console.log(
        "Voice translation: READY"
    );

    console.log(
        "=========================================="
    );

});