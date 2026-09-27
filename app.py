from flask import Flask, render_template, request, jsonify
from langdetect import detect, LangDetectException
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import pytesseract
import requests
import os
import re
import shutil
from functools import lru_cache


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

# Maximum uploaded image size: 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024


# ============================================================
# TESSERACT CONFIGURATION
# ============================================================

# Automatically find Tesseract on Windows or Linux/Docker.
TESSERACT_PATH = shutil.which("tesseract")

if TESSERACT_PATH:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# ============================================================
# LANGUAGE LIST
# ============================================================

LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "te": "Telugu",
    "ta": "Tamil",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "ne": "Nepali",
    "sa": "Sanskrit",

    "ja": "Japanese",
    "zh-CN": "Chinese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ar": "Arabic",
    "tr": "Turkish",
    "nl": "Dutch",
    "th": "Thai",
    "vi": "Vietnamese"
}


# ============================================================
# LANGUAGE CODE MAPPING
# ============================================================

DETECTED_LANGUAGE_MAP = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "te": "Telugu",
    "ta": "Tamil",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "ne": "Nepali",
    "sa": "Sanskrit",

    "ja": "Japanese",

    "zh-cn": "Chinese",
    "zh": "Chinese",

    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ar": "Arabic",
    "tr": "Turkish",
    "nl": "Dutch",
    "th": "Thai",
    "vi": "Vietnamese"
}


# ============================================================
# CULTURAL TIPS
# ============================================================

CULTURAL_TIPS = {

    "ja":
        "In Japan, polite expressions and respectful language are important.",

    "ko":
        "Korean communication often uses different levels of politeness depending on the situation.",

    "hi":
        "Using respectful words such as 'ji' can make communication more polite in Hindi.",

    "kn":
        "Kannada communication often uses respectful forms when speaking with elders.",

    "fr":
        "Using 'vous' is generally more formal and polite than 'tu' in French.",

    "de":
        "German uses formal and informal forms of address depending on the relationship.",

    "es":
        "Spanish has regional differences in vocabulary and formal expressions.",

    "zh-CN":
        "Respect and appropriate forms of address are important in Chinese communication.",

    "ar":
        "Greetings and respectful expressions are especially important in Arabic-speaking cultures.",

    "en":
        "English communication style can vary between formal and informal situations.",

    "te":
        "Respectful forms of communication are commonly used when speaking with elders in Telugu.",

    "ta":
        "Tamil communication often uses respectful forms when speaking with elders.",

    "ml":
        "Respectful forms of address are commonly used when communicating with elders in Malayalam.",

    "mr":
        "Respectful expressions are commonly used when speaking with elders in Marathi.",

    "bn":
        "Polite forms of address are important in many Bengali-speaking situations."
}


# ============================================================
# LANGUAGE NORMALIZATION
# ============================================================

def normalize_language(language):

    if not language:
        return "auto"

    language = str(language).strip()

    if language.lower() == "zh-cn":
        return "zh-CN"

    if language.lower() == "zh":
        return "zh-CN"

    return language


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language_code(text):

    text = str(text).strip()

    if not text:
        return None

    try:

        detected = detect(text)
        detected = detected.lower()

        if detected == "zh-cn":
            return "zh-CN"

        if detected == "zh":
            return "zh-CN"

        return detected

    except LangDetectException:

        return None


# ============================================================
# LANGUAGE NAME
# ============================================================

def get_language_name(language_code):

    if not language_code:
        return "Unknown"

    normalized = str(language_code).lower()

    return DETECTED_LANGUAGE_MAP.get(
        normalized,
        LANGUAGES.get(
            language_code,
            language_code
        )
    )


# ============================================================
# MYMEMORY TRANSLATION
# ============================================================

def perform_translation(text, source, target):

    """
    Performs translation using the MyMemory Translation API.

    This replaces the previous deep-translator / Google
    translation implementation.
    """

    source = normalize_language(source)
    target = normalize_language(target)

    # MyMemory requires an actual source language.
    if source == "auto":

        detected = detect_language_code(text)

        if detected:
            source = detected

        else:

            raise RuntimeError(
                "Unable to detect the source language."
            )

    # Same language = no API request required.
    if source == target:

        return text

    # MyMemory API
    url = "https://api.mymemory.translated.net/get"

    params = {
        "q": text,
        "langpair": f"{source}|{target}"
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=20
        )

        response.raise_for_status()

    except requests.exceptions.Timeout:

        raise RuntimeError(
            "Translation service timed out. "
            "Please try again."
        )

    except requests.exceptions.ConnectionError:

        raise RuntimeError(
            "Unable to connect to the translation service. "
            "Please check your internet connection."
        )

    except requests.exceptions.RequestException as e:

        raise RuntimeError(
            f"Translation service error: {str(e)}"
        )

    # --------------------------------------------------------
    # READ API RESPONSE
    # --------------------------------------------------------

    try:

        data = response.json()

    except ValueError:

        raise RuntimeError(
            "Translation service returned an invalid response."
        )

    # --------------------------------------------------------
    # CHECK RESPONSE STATUS
    # --------------------------------------------------------

    response_status = data.get(
        "responseStatus"
    )

    if response_status != 200:

        error_message = data.get(
            "responseDetails",
            "Translation service rejected the request."
        )

        raise RuntimeError(
            f"Translation failed: {error_message}"
        )

    # --------------------------------------------------------
    # GET TRANSLATED TEXT
    # --------------------------------------------------------

    response_data = data.get(
        "responseData",
        {}
    )

    translated_text = response_data.get(
        "translatedText",
        ""
    )

    translated_text = str(
        translated_text
    ).strip()

    if not translated_text:

        raise RuntimeError(
            "Translation service returned empty text."
        )

    return translated_text


# ============================================================
# CACHED TRANSLATION
# ============================================================

@lru_cache(maxsize=500)
def cached_translation(text, source, target):

    """
    Stores up to 500 previous translations.

    If the same text is translated again using the same
    source and target language, the API is not contacted.
    """

    return perform_translation(
        text,
        source,
        target
    )


# ============================================================
# TRANSLATE TEXT
# ============================================================

def translate_text(text, source, target):

    text = str(text).strip()

    source = normalize_language(source)
    target = normalize_language(target)

    if not text:

        raise ValueError(
            "Please enter some text."
        )

    if not target or target == "auto":

        raise ValueError(
            "Please select a valid target language."
        )

    # --------------------------------------------------------
    # AUTOMATIC SOURCE DETECTION
    # --------------------------------------------------------

    if source == "auto":

        detected = detect_language_code(
            text
        )

        if not detected:

            raise RuntimeError(
                "Unable to detect the source language."
            )

        source = detected

    # --------------------------------------------------------
    # SAME LANGUAGE
    # --------------------------------------------------------

    if source == target:

        return text

    # --------------------------------------------------------
    # CACHE
    # --------------------------------------------------------

    try:

        result = cached_translation(
            text,
            source,
            target
        )

        return result

    except RuntimeError:

        raise

    except Exception as e:

        raise RuntimeError(
            f"Translation failed: {str(e)}"
        )


# ============================================================
# CLEAR TRANSLATION CACHE
# ============================================================

@app.route(
    "/clear-translation-cache",
    methods=["POST"]
)
def clear_translation_cache():

    try:

        cached_translation.cache_clear()

        return jsonify({

            "success": True,

            "message":
                "Translation cache cleared."

        }), 200

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ============================================================
# TRANSLATION CACHE STATUS
# ============================================================

@app.route(
    "/translation-cache-status"
)
def translation_cache_status():

    cache_info = cached_translation.cache_info()

    return jsonify({

        "success": True,

        "cache_hits":
            cache_info.hits,

        "cache_misses":
            cache_info.misses,

        "cache_size":
            cache_info.currsize,

        "maximum_cache_size":
            cache_info.maxsize

    }), 200


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ============================================================
# NORMAL TEXT TRANSLATION
# ============================================================

@app.route(
    "/translate",
    methods=["POST"]
)
def translate():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No data received."

            }), 400

        text = str(
            data.get(
                "text",
                ""
            )
        ).strip()

        source = normalize_language(
            data.get(
                "source",
                "auto"
            )
        )

        target = normalize_language(
            data.get(
                "target",
                "en"
            )
        )

        if not text:

            return jsonify({

                "success": False,

                "error":
                    "Please enter some text."

            }), 400

        if not target or target == "auto":

            return jsonify({

                "success": False,

                "error":
                    "Please select a valid target language."

            }), 400

        # ----------------------------------------------------
        # AUTOMATIC LANGUAGE DETECTION
        # ----------------------------------------------------

        detected_language = None

        if source == "auto":

            detected_language = detect_language_code(
                text
            )

            if detected_language:

                source = detected_language

            else:

                return jsonify({

                    "success": False,

                    "error":
                        "Unable to detect the source language."

                }), 400

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

        translation = translate_text(
            text,
            source,
            target
        )

        # ----------------------------------------------------
        # EMOTION
        # ----------------------------------------------------

        emotion = detect_emotion(
            text
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "translation":
                translation,

            "emotion":
                emotion,

            "source":
                source,

            "target":
                target,

            "detected_language":
                detected_language,

            "detected_language_name":
                get_language_name(
                    detected_language
                )

        }), 200

    except Exception as e:

        print(
            "Translation Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# LANGUAGE DETECTION
# ============================================================

@app.route(
    "/detect-language",
    methods=["POST"]
)
def detect_language():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No data received."

            }), 400

        text = str(
            data.get(
                "text",
                ""
            )
        ).strip()

        if not text:

            return jsonify({

                "success": False,

                "error":
                    "Please enter text."

            }), 400

        detected_code = detect_language_code(
            text
        )

        if not detected_code:

            return jsonify({

                "success": False,

                "error":
                    "Unable to detect the language."

            }), 400

        detected_name = get_language_name(
            detected_code
        )

        return jsonify({

            "success": True,

            "language_code":
                detected_code,

            "language":
                detected_name

        }), 200

    except Exception as e:

        print(
            "Language Detection Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(image):

    """
    Improves image quality before OCR.

    Steps:
    1. Convert to RGB
    2. Resize small images
    3. Convert to grayscale
    4. Increase contrast
    5. Sharpen
    6. Autocontrast
    """

    image = image.convert(
        "RGB"
    )

    # --------------------------------------------------------
    # RESIZE
    # --------------------------------------------------------

    width, height = image.size

    if width < 1600:

        scale = 1600 / width

        new_width = int(
            width * scale
        )

        new_height = int(
            height * scale
        )

        image = image.resize(
            (
                new_width,
                new_height
            ),
            Image.Resampling.LANCZOS
        )

    # --------------------------------------------------------
    # GRAYSCALE
    # --------------------------------------------------------

    gray = ImageOps.grayscale(
        image
    )

    # --------------------------------------------------------
    # CONTRAST
    # --------------------------------------------------------

    gray = ImageEnhance.Contrast(
        gray
    ).enhance(2.0)

    # --------------------------------------------------------
    # SHARPEN
    # --------------------------------------------------------

    gray = ImageEnhance.Sharpness(
        gray
    ).enhance(2.0)

    gray = gray.filter(
        ImageFilter.SHARPEN
    )

    # --------------------------------------------------------
    # AUTOCONTRAST
    # --------------------------------------------------------

    gray = ImageOps.autocontrast(
        gray
    )

    return gray


# ============================================================
# OCR LANGUAGE SELECTION
# ============================================================

def get_ocr_languages():

    """
    Returns OCR languages installed in Tesseract.
    """

    try:

        installed = pytesseract.get_languages(
            config=""
        )

        installed = [
            language.lower()
            for language in installed
        ]

        languages = []

        if "eng" in installed:
            languages.append("eng")

        if "jpn" in installed:
            languages.append("jpn")

        if "chi_sim" in installed:
            languages.append("chi_sim")

        if "kor" in installed:
            languages.append("kor")

        if "hin" in installed:
            languages.append("hin")

        if "kan" in installed:
            languages.append("kan")

        if "tel" in installed:
            languages.append("tel")

        if "tam" in installed:
            languages.append("tam")

        if "mal" in installed:
            languages.append("mal")

        if not languages:

            return "eng"

        return "+".join(
            languages
        )

    except Exception:

        return "eng"


# ============================================================
# OCR
# ============================================================

def perform_ocr(image):

    """
    Performs OCR using multiple Tesseract configurations
    and selects the best readable result.
    """

    processed = preprocess_image(
        image
    )

    # --------------------------------------------------------
    # CHECK AVAILABLE OCR LANGUAGES
    # --------------------------------------------------------

    ocr_languages = get_ocr_languages()

    print(
        "Available OCR languages:",
        ocr_languages
    )

    results = []

    # --------------------------------------------------------
    # OCR CONFIGURATIONS
    # --------------------------------------------------------

    configurations = [

        "--oem 3 --psm 6",

        "--oem 3 --psm 11",

        "--oem 3 --psm 12"

    ]

    # --------------------------------------------------------
    # NORMAL OCR
    # --------------------------------------------------------

    for config in configurations:

        try:

            text = pytesseract.image_to_string(
                processed,
                lang=ocr_languages,
                config=config
            )

            text = clean_ocr_text(
                text
            )

            if text:

                results.append(
                    text
                )

        except Exception as e:

            print(
                "OCR attempt failed:",
                str(e)
            )

    # --------------------------------------------------------
    # THRESHOLD OCR
    # --------------------------------------------------------

    try:

        threshold = processed.point(
            lambda pixel:
            255 if pixel > 150 else 0
        )

        for config in configurations:

            try:

                text = pytesseract.image_to_string(
                    threshold,
                    lang=ocr_languages,
                    config=config
                )

                text = clean_ocr_text(
                    text
                )

                if text:

                    results.append(
                        text
                    )

            except Exception as e:

                print(
                    "Threshold OCR failed:",
                    str(e)
                )

    except Exception as e:

        print(
            "Threshold creation failed:",
            str(e)
        )

    # --------------------------------------------------------
    # REMOVE DUPLICATES
    # --------------------------------------------------------

    unique_results = []

    for result in results:

        if result not in unique_results:

            unique_results.append(
                result
            )

    # --------------------------------------------------------
    # SELECT BEST RESULT
    # --------------------------------------------------------

    if not unique_results:

        return ""

    best_result = max(
        unique_results,
        key=ocr_score
    )

    return best_result.strip()


# ============================================================
# CLEAN OCR TEXT
# ============================================================

def clean_ocr_text(text):

    if not text:

        return ""

    text = text.replace(
        "\x0c",
        ""
    )

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    text = re.sub(
        r"\n\s*\n\s*\n+",
        "\n\n",
        text
    )

    return text.strip()


# ============================================================
# OCR SCORE
# ============================================================

def ocr_score(text):

    if not text:

        return 0

    score = 0

    # Number of non-space characters
    score += len(
        re.sub(
            r"\s",
            "",
            text
        )
    )

    # Penalize very short OCR
    if len(text.strip()) < 2:

        score -= 10

    # Reward multiple lines
    if "\n" in text:

        score += 5

    return score


# ============================================================
# IMAGE → OCR → TRANSLATION
# ============================================================

@app.route(
    "/image-translate",
    methods=["POST"]
)
def image_translate():

    try:

        # ----------------------------------------------------
        # CHECK FILE
        # ----------------------------------------------------

        if "image" not in request.files:

            return jsonify({

                "success": False,

                "error":
                    "No image was uploaded."

            }), 400

        image_file = request.files[
            "image"
        ]

        if image_file.filename == "":

            return jsonify({

                "success": False,

                "error":
                    "Please select an image."

            }), 400

        # ----------------------------------------------------
        # TARGET LANGUAGE
        # ----------------------------------------------------

        target = normalize_language(
            request.form.get(
                "target",
                "en"
            )
        )

        if not target or target == "auto":

            target = "en"

        # ----------------------------------------------------
        # OPEN IMAGE
        # ----------------------------------------------------

        try:

            image = Image.open(
                image_file
            )

            image.load()

        except Exception:

            return jsonify({

                "success": False,

                "error":
                    "The uploaded file is not a valid image."

            }), 400

        # ----------------------------------------------------
        # OCR
        # ----------------------------------------------------

        extracted_text = perform_ocr(
            image
        )

        if not extracted_text:

            return jsonify({

                "success": False,

                "error":
                    "No readable text was found. "
                    "Try a clearer image with larger "
                    "and sharper characters."

            }), 400

        # ----------------------------------------------------
        # DETECT OCR LANGUAGE
        # ----------------------------------------------------

        detected_language = detect_language_code(
            extracted_text
        )

        if not detected_language:

            return jsonify({

                "success": False,

                "error":
                    "Text was detected, but its language "
                    "could not be identified.",

                "extracted_text":
                    extracted_text

            }), 400

        # ----------------------------------------------------
        # TRANSLATION
        # ----------------------------------------------------

        try:

            translated_text = translate_text(
                extracted_text,
                detected_language,
                target
            )

        except Exception as translation_error:

            print(
                "Image translation failed:",
                str(translation_error)
            )

            return jsonify({

                "success": False,

                "error":
                    "Text was detected, but translation failed: "
                    + str(translation_error),

                "extracted_text":
                    extracted_text,

                "detected_language":
                    detected_language

            }), 500

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "extracted_text":
                extracted_text,

            "translation":
                translated_text,

            "detected_language":
                detected_language,

            "detected_language_name":
                get_language_name(
                    detected_language
                ),

            "target_language":
                target,

            "target_language_name":
                LANGUAGES.get(
                    target,
                    target
                )

        }), 200

    except Exception as e:

        print(
            "Image Translation Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# CONVERSATION TRANSLATION
# ============================================================

@app.route(
    "/conversation-translate",
    methods=["POST"]
)
def conversation_translate():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No data received."

            }), 400

        # ----------------------------------------------------
        # MESSAGE
        # ----------------------------------------------------

        text = str(
            data.get(
                "text",
                ""
            )
        ).strip()

        # ----------------------------------------------------
        # SOURCE
        # ----------------------------------------------------

        source = normalize_language(
            data.get(
                "source",
                "en"
            )
        )

        # ----------------------------------------------------
        # TARGET
        # ----------------------------------------------------

        target = normalize_language(
            data.get(
                "target",
                "ja"
            )
        )

        if not text:

            return jsonify({

                "success": False,

                "error":
                    "Please enter a message."

            }), 400

        if not source or source == "auto":

            source = detect_language_code(
                text
            )

            if not source:

                return jsonify({

                    "success": False,

                    "error":
                        "Unable to detect source language."

                }), 400

        if not target or target == "auto":

            target = "ja"

        # ----------------------------------------------------
        # TRANSLATE
        # ----------------------------------------------------

        translation = translate_text(
            text,
            source,
            target
        )

        # ----------------------------------------------------
        # CULTURAL TIP
        # ----------------------------------------------------

        cultural_tip = get_cultural_tip(
            target
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "translation":
                translation,

            "cultural_tip":
                cultural_tip,

            "source":
                source,

            "target":
                target,

            "source_language":
                LANGUAGES.get(
                    source,
                    source
                ),

            "target_language":
                LANGUAGES.get(
                    target,
                    target
                )

        }), 200

    except Exception as e:

        print(
            "Conversation Translation Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# VOICE TRANSLATION
# ============================================================

@app.route(
    "/voice-translate",
    methods=["POST"]
)
def voice_translate():

    """
    Browser microphone
            ↓
    Speech recognition
            ↓
    /voice-translate
            ↓
    Translation
            ↓
    JavaScript speech synthesis
    """

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No voice data received."

            }), 400

        # ----------------------------------------------------
        # RECOGNIZED SPEECH
        # ----------------------------------------------------

        text = str(
            data.get(
                "text",
                ""
            )
        ).strip()

        # ----------------------------------------------------
        # SOURCE
        # ----------------------------------------------------

        source = normalize_language(
            data.get(
                "source",
                "en"
            )
        )

        # ----------------------------------------------------
        # TARGET
        # ----------------------------------------------------

        target = normalize_language(
            data.get(
                "target",
                "en"
            )
        )

        if not text:

            return jsonify({

                "success": False,

                "error":
                    "No speech text was received."

            }), 400

        if not source or source == "auto":

            source = detect_language_code(
                text
            )

            if not source:

                return jsonify({

                    "success": False,

                    "error":
                        "Unable to detect source language."

                }), 400

        if not target or target == "auto":

            target = "en"

        # ----------------------------------------------------
        # TRANSLATE
        # ----------------------------------------------------

        translation = translate_text(
            text,
            source,
            target
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "text":
                text,

            "translation":
                translation,

            "source":
                source,

            "target":
                target,

            "source_language":
                LANGUAGES.get(
                    source,
                    source
                ),

            "target_language":
                LANGUAGES.get(
                    target,
                    target
                )

        }), 200

    except Exception as e:

        print(
            "Voice Translation Error:",
            str(e)
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# EMOTION DETECTION
# ============================================================

def detect_emotion(text):

    text_lower = str(
        text
    ).lower()

    positive_words = [

        "happy",
        "good",
        "great",
        "excellent",
        "love",
        "wonderful",
        "amazing",
        "nice",
        "thank",
        "thanks",
        "awesome",
        "joy",
        "glad",
        "excited"

    ]

    negative_words = [

        "sad",
        "bad",
        "hate",
        "angry",
        "terrible",
        "worst",
        "pain",
        "sorry",
        "upset",
        "problem",
        "cry",
        "afraid",
        "hurt",
        "disappointed"

    ]

    angry_words = [

        "angry",
        "furious",
        "mad",
        "hate",
        "stupid",
        "idiot",
        "annoying",
        "rage",
        "ridiculous"

    ]

    # --------------------------------------------------------
    # ANGRY
    # --------------------------------------------------------

    if any(
        word in text_lower
        for word in angry_words
    ):

        return "Angry"

    # --------------------------------------------------------
    # HAPPY
    # --------------------------------------------------------

    if any(
        word in text_lower
        for word in positive_words
    ):

        return "Happy"

    # --------------------------------------------------------
    # SAD
    # --------------------------------------------------------

    if any(
        word in text_lower
        for word in negative_words
    ):

        return "Sad"

    return "Neutral"


# ============================================================
# CULTURAL TIP
# ============================================================

def get_cultural_tip(language):

    language = normalize_language(
        language
    )

    return CULTURAL_TIPS.get(

        language,

        "Cultural expressions may vary depending "
        "on the region and situation."

    )


# ============================================================
# TESSERACT STATUS
# ============================================================

@app.route(
    "/tesseract-status"
)
def tesseract_status():

    try:

        languages = pytesseract.get_languages(
            config=""
        )

        tesseract_found = bool(
            TESSERACT_PATH
        )

        return jsonify({

            "success": True,

            "tesseract_found":
                tesseract_found,

            "tesseract_path":
                TESSERACT_PATH,

            "languages":
                languages,

            "japanese_available":
                "jpn" in languages,

            "english_available":
                "eng" in languages

        }), 200

    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e),

            "tesseract_found":
                bool(TESSERACT_PATH),

            "tesseract_path":
                TESSERACT_PATH

        }), 500


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({

        "status":
            "running",

        "application":
            "LinguaAI",

        "translation_service":
            "MyMemory Translation API",

        "tesseract":
            "available" if TESSERACT_PATH else "not found",

        "features": [

            "Text Translation",

            "Automatic Language Detection",

            "Image OCR Translation",

            "Japanese OCR Support",

            "Conversation A to B",

            "Conversation B to A",

            "Voice Translation",

            "Emotion Detection",

            "Cultural Tips",

            "Translation Cache"

        ],

        "routes": [

            "/",

            "/translate",

            "/detect-language",

            "/image-translate",

            "/conversation-translate",

            "/voice-translate",

            "/tesseract-status",

            "/translation-cache-status",

            "/clear-translation-cache",

            "/health"

        ]

    }), 200


# ============================================================
# 413 - FILE TOO LARGE
# ============================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({

        "success": False,

        "error":
            "Image is too large. "
            "Please upload an image smaller than 10 MB."

    }), 413


# ============================================================
# 404 ERROR HANDLER
# ============================================================

@app.errorhandler(404)
def page_not_found(error):

    return jsonify({

        "success": False,

        "error":
            "Page not found. "
            "Please check the requested Flask route."

    }), 404


# ============================================================
# 500 ERROR HANDLER
# ============================================================

@app.errorhandler(500)
def internal_server_error(error):

    return jsonify({

        "success": False,

        "error":
            "Internal server error."

    }), 500


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    print("=" * 70)

    print(
        "LinguaAI - Smart Translation App"
    )

    print("=" * 70)

    print(
        "Local access:"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print(
        "Network access:"
    )

    print(
        "http://YOUR_LOCAL_IP:5000"
    )

    print("=" * 70)

    print(
        "Translation service:"
    )

    print(
        "MyMemory Translation API"
    )

    print("=" * 70)

    print(
        "Available features:"
    )

    print(
        "1. Text Translation"
    )

    print(
        "2. Language Detection"
    )

    print(
        "3. Conversation A -> B"
    )

    print(
        "4. Conversation B -> A"
    )

    print(
        "5. Image OCR Translation"
    )

    print(
        "6. Voice Translation"
    )

    print(
        "7. Emotion Detection"
    )

    print(
        "8. Cultural Tips"
    )

    print(
        "9. Translation Cache"
    )

    print("=" * 70)

    # --------------------------------------------------------
    # TESSERACT CHECK
    # --------------------------------------------------------

    if TESSERACT_PATH:

        print(
            "Tesseract: FOUND"
        )

        print(
            "Tesseract path:",
            TESSERACT_PATH
        )

        try:

            installed_languages = (
                pytesseract.get_languages(
                    config=""
                )
            )

            print(
                "OCR languages:",
                installed_languages
            )

            if "jpn" in installed_languages:

                print(
                    "Japanese OCR: AVAILABLE"
                )

            else:

                print(
                    "Japanese OCR: NOT INSTALLED"
                )

        except Exception as e:

            print(
                "Could not check Tesseract languages:",
                str(e)
            )

    else:

        print(
            "Tesseract: NOT FOUND"
        )

        print(
            "Install Tesseract OCR before using image translation."
        )

    print("=" * 70)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )