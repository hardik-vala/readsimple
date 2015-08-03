/* Original body HTML source. */
var originalContent = null;
/* Translated body HTML source. */
var translatedContent = null;

/* Flag to indicate whether the active web page has been translated. */
var isTranslated = false;

/* Stores the ReadSimple score (# translations / # words) for the active
 * page. */
var readSimpleScore = null;

/* Spinner object to display when a page is being simplified. */
// TODO: Move to seperate dedicated file.
var spinner = null;

/* Styling to inject when the spinner is activated and displayed. */
// TODO: Move to seperate dedicated file.
var spinnerStyle = "<style> \
 		#_spinner-background { \
 			background-color:black; \
 			position:fixed; \
 			left:0; \
 			top:0; \
 			height:100%; \
 			width:100%; \
 			opacity:0.3; \
 			z-index:2000000000; \
 		} \
 		\
 		#_spinner-text { \
 			color:#FFF; \
 			font-family:Arial, Helvetica, sans-serif; \
 			font-size:36px; \
 			margin-top:75px; \
 			opacity:1; \
 			text-align:center; \
 			text-shadow: 2px 2px 1px rgba(0, 0, 0, 1); \
 		} \
 	</style>";

/* ReadSimple styling to inject for highlighting translated content. */
// TODO: Move to seperate dedicated file.
var readSimpleStyle = "<style> \
 		._read-simple-text { \
 			background: #FFEF4C; \
 		} \
 		._read-simple-definition { \
 			background: #3FDFFF; \
 		} \
 		\
 		span._read-simple-text { \
 		  position: relative; \
 		  display: inline; \
 		} \
 		\
 		span._read-simple-text span { \
 		  position: absolute; \
 		  width: 200px; \
 		  color: #000; \
 		  background: #FFF; \
 		  border: 2px solid #459CFF; \
 		  font-family: Arial, Helvetica, sans-serif; \
 		  font-size: 12px; \
 		  font-style: normal; \
 		  height: 30px; \
 		  line-height: 30px; \
 		  text-align: center; \
 		  visibility: hidden; \
 		  border-radius: 3px; \
 		  box-shadow: 2px 2px 6px #000000; \
 		} \
 		\
 		span._read-simple-text span:before { \
 		  content: ''; \
 		  position: absolute; \
 		  top: 100%; \
 		  left: 50%; \
 		  margin-left: -12px; \
 		  width: 0; \
 		  height: 0; \
 		  border-top: 12px solid #459CFF; \
 		  border-right: 12px solid transparent; \
 		  border-left: 12px solid transparent; \
 		} \
 		\
 		span._read-simple-text span:after { \
 		  content: ''; \
 		  position: absolute; \
 		  top: 100%; \
 		  left: 50%; \
 		  margin-left: -8px; \
 		  width: 0; \
 		  height: 0; \
 		  border-top: 8px solid #FFFFFF; \
 		  border-right: 8px solid transparent; \
 		  border-left: 8px solid transparent; \
 		} \
 		\
 		span:hover._read-simple-text span { \
 		  visibility: visible; \
 		  opacity: 1.0; \
 		  bottom: 30px; \
 		  left: 50%; \
 		  margin-left: -76px; \
 		  z-index: 999; \
 		} \
 	</style>"

/* Spinner options. */
// TODO: Move to seperate dedicated file.
var spinnerOpts = {
  lines: 16, // The number of lines to draw
  length: 20, // The length of each line
  width: 5, // The line thickness
  radius: 35, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#FFF', // #rgb or #rrggbb or array of colors
  speed: 1, // Rounds per second
  trail: 45, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%' // Left position relative to parent
};

/**
 * Get the body source of the current page as a string.
 */
function getContent() {
	return document.body.innerHTML || document.body.textContent;
};

/**
 * Set the body source of the current page.
 *
 * @param {string} content - HTML content to the set.
 */
function setContent(content) {
	if (document.body.innerHTML)
		document.body.innerHTML = content;
	else if (document.body.textContent)
		document.body.textContent = content;
};

/**
 * Start the spinner and display the spinner page.
 */
// TODO: Move to seperate dedicated file.
function startSpinner() {
	setContent(spinnerStyle + "\n\n" + "<div id=\"_spinner-background\">" + 
		"<p id=\"_spinner-text\">Making simple...</p>" +
		"</div>\n<div id=\"spinner\">" + "</div>\n\n" + originalContent);
	var target = document.getElementById('spinner');
	spinner = new Spinner(spinnerOpts).spin(target);
};

/**
 * Stop the spinner.
 */
// TODO: Move to seperate dedicated file.
function stopSpinner() {
	spinner.stop();
};

/**
 * Rewordifies the given text.
 *
 * @param {string} text - Text to Rewordify.
 * @param {function(string, string)} callback - Called when the input text is
 *   Rewordified. First argument is an error code (null if no error) and the
 *	 second the Rewordified text (null if there is an error).
 */
function rewordify(text, callback) {
	// Surrounds the given translation with HTML styling.
	function styleTranslation(orig, translation) {
		return "<span class=\"_read-simple-text\">" + translation +
			"<span>Original: <b>" + orig + "</b></span></span>";
	};

	// Surrounds the given definition with HTML styling.
	function styleDefintion(orig, translation) {
		return "<span class=\"_read-simple-definition\">" + orig + ' ' +
			translation + "</span>";
	};

	// Parses the raw Rewordified text returned by Rewordify, returning the
	// parsed translation as well as the number of translations and definitions.
	function parseRewordify(rwText) {
		var rwTextSplitterRegex = /(\|_((?!_\|).)*_\|\|\^((?!\^\|).)*\^\|)/g;
		var splitRWText = rwText.split(rwTextSplitterRegex);
		
		// Drop leading empty string.
		if (splitRWText.length > 0 && splitRWText[0].trim() === "")
			splitRWText = splitRWText.slice(1, splitRWText.length);

		// Filter out the two extraneous characters outputted after RW
		// translation segments.
		var filteredSplitRWText = [];
		var i = 0;
		while (i < splitRWText.length) {
			filteredSplitRWText.push(splitRWText[i]);

			if (splitRWText[i].startsWith('|_'))
				i += 3;
			else
				i++;
		}

		var parsedText = "";
		var numTranslations = 0;
		for (var i = 0, len = filteredSplitRWText.length; i < len; i++) {
			if (filteredSplitRWText[i].startsWith('|_')) {
				var parts = filteredSplitRWText[i].split('_||^');
				var orig = parts[0].substring(2, parts[0].length);
				var translation = parts[1].substring(0, parts[1].length - 2);

				if (translation.startsWith('(') && translation.endsWith(')'))
					parsedText += styleDefintion(orig, translation);
				else
					parsedText += styleTranslation(orig, translation);

				numTranslations++;
			} else
				parsedText += filteredSplitRWText[i];
		}

		return {translation: parsedText, numTranslations: numTranslations};
	};

	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.status == 200 && xhr.status < 300) {
				var json = JSON.parse(xhr.responseText);
				if (json.status != 'G') {
					console.err("content.js: Error code: " + json.status);
					callback(json.status, null);
				} else
					callback(null, parseRewordify(json.rs));	
			}
		}
	};

	xhr.open('POST', "https://rewordify.com/rewordifyapi.php");
	xhr.setRequestHeader('Content-Type', "application/x-www-form-urlencoded");

	var input = {
		// TODO: Load customer Id and API key from file.
		custid : '4947',
		apikey: '95KN3UDPAQ3B',
		// TODO: Allow different reading levels (Reading levels: E,1,2,3,4,H).
		level: 'E',
		ss: text
	};

	params = "rwrequest=" + encodeURIComponent(JSON.stringify(input));
	xhr.send(params);
};

/**
 * Translates (through Rewordify) the given HTML source content.
 *
 * @param {string} content - HTML source content to translate.
 * @param {function(string, string)} callback - Called when the input text is
 *   translated. First argument is an error code (null if no error) and the
 *	 second the translated text (null if there is an error).
 */
function translateContent(content, callback) {
	// Split the content by HTML tags, keeping the tags.
	var splitOriginalContent = content.split(/(<[^>]*>)/g);
	
	var parsedContentList = [], inScript = false, inStyle = false;
	for (var i = 0, len = splitOriginalContent.length; i < len; i++) {
		// Skip script tags and content.
		if (splitOriginalContent[i].startsWith('<script'))
			inScript = true;

		if (splitOriginalContent[i].startsWith('</script'))
			inScript = false;

		// Skip style tags and content.
		if (splitOriginalContent[i].startsWith('<style'))
			inStyle = true;

		if (splitOriginalContent[i].startsWith('</style'))
			inStyle = false;

		if (inScript || inStyle)
			continue;

		// Skip tags and comments.
		if (splitOriginalContent[i].startsWith('<'))
			continue;

		// Skip non-alphabetical (includes whitespace).
		if (/^[^A-Za-z]*$/.test(splitOriginalContent[i]))
			continue;

		// Skip &nbsp;'s.
		if (/^\W*[&nbsp;]\W*$/.test(splitOriginalContent[i]))
			continue;

		// Add only the text portions with their index in the original split
		// content.
		parsedContentList.push({ index: i, text: splitOriginalContent[i] });
	}

	var textParts = parsedContentList.map(function (t) { return t.text; });
	// Combine the text portions, seperated by '\n<>\n', into a single text for
	// Rewordify.
	var inputText = textParts.join('\n<>\n');

	// TODO: Implement better word counting.
	var wordCount = 0;
	textParts.forEach(function (t) {
		wordCount += t.split(/\s+/).length;
	});

	// Copy the orignal split content.
	var splitTranslatedContent = splitOriginalContent.slice();
	rewordify(inputText, function (err, translation) {
		if (err)
			callback(err, null);
		else {
			var splitTranslation = translation.translation.split('\n<>\n');
			for (var i in splitTranslation) {
				var index = parsedContentList[i].index
				splitTranslatedContent[index] = splitTranslation[i]
			}

			readSimpleScore = translation.numTranslations * 1.0 / wordCount;

			// Inject ReadSimple text styling.
			splitTranslatedContent.unshift('\n' + readSimpleStyle + '\n');

			callback(null, splitTranslatedContent.join(''));
		}
	}); 
};

/**
 * Initiate the translation success notification.
 */
function notifyTranslationSuccess() {
	$.notify("Made Simple!", 'success');
};

/**
 * Initiate the ReadSimple score notification.
 */
function notifyReadSimpleScore() {
	$.notify("RS-Score: " + (Math.round(readSimpleScore * 100.0) / 100),
		'info');
};

/**
 * Toggle between the original and translated content.
 */
function toggleTranslation() {
	if (isTranslated) {
		setContent(originalContent);
		isTranslated = false;
	} else {
		if (!originalContent)
			originalContent = getContent();

		// Lazy translation.
		if (!translatedContent) {
			startSpinner();
			translateContent(originalContent, function (err, translated) {
				if (err)
					console.err("ERROR: " + err);
				else {
					translatedContent = translated;
					stopSpinner();
					setContent(translatedContent);
					isTranslated = true;

					notifyTranslationSuccess();
					notifyReadSimpleScore();
				}
			});
		} else {
			setContent(translatedContent);
			isTranslated = true;
		}
	}
};

// Add a listener toggling tranlation when a browser action is intiated by a
// click.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message === 'clicked_browser_action')
	  toggleTranslation();
});
