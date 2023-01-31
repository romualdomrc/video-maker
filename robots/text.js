const wiki = require('wikipedia')
const sentenceBoundaryDetection = require('sbd')
const watsonApiKey = require('../credentials/watson-nlu.json').apikey

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js')
const { IamAuthenticator } = require('ibm-watson/auth')

const nlu = new NaturalLanguageUnderstandingV1({
  authenticator: new IamAuthenticator({apikey: 'B3YzguGnixfugQVM6M18s6uL1UT6frUIG5nqgExTGmFa' }),
  version: '2022-04-07',
  serviceUrl: 'https://api.au-syd.natural-language-understanding.watson.cloud.ibm.com'
})

const state = require('./state.js')

async function robot() {
	console.log('> [text-robot] Starting...')

	const content = state.load()

	await fetchContentFromWikipedia(content)
	sanitizeContent(content)
	breakContentIntoSentences(content)
	limitMaximumSentences(content)
	await fetchKeywordsOfAllSentences(content)

	state.save(content)

	async function fetchContentFromWikipedia(content){
		const pageContent = {}

   		const page = await wiki.page(content.searchTerm)

    		pageContent.content = await page.content()
    		pageContent.images = await page.images()
    		pageContent.links = await page.links()
    		pageContent.pageid = page.pageid
    		pageContent.references = await page.references()
    		pageContent.summary = await page.summary()
    		pageContent.title = page.title
    		pageContent.url = page.fullurl

    		content.sourceContentOriginal = pageContent.content
	}
	
	function sanitizeContent(content) {
		const withoutBlankLinesAndMarkDown = removeBlankLinesAndMarkDown(content.sourceContentOriginal)
		const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkDown)

		content.sourceContentSanitized = withoutDatesInParentheses

		function removeBlankLinesAndMarkDown(text){
			const allLines = text.split('\n')

			const withoutBlankLinesAndMarkDown = allLines.filter((line) =>{
				if (line.trim().length === 0 || line.trim().startsWith('=')) {
					return false
				}
				return true
			})

			return withoutBlankLinesAndMarkDown.join(' ')

		}


		function removeDatesInParentheses(text){
    			return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')

		}

	}

	
	function breakContentIntoSentences(content) {
    		content.sentences = []

    		const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
    		sentences.forEach((sentence) => {
      			content.sentences.push({
        			text: sentence,
        			keywords: [],
        			images: []
      			})
    		})
  	}

	function limitMaximumSentences(content) {
    		content.sentences = content.sentences.slice(0, content.maximumSentences)
  	}

  	async function fetchKeywordsOfAllSentences(content) {
    		console.log('> [text-robot] Starting to fetch keywords from Watson')

    		for (const sentence of content.sentences) {
      			console.log(`> [text-robot] Sentence: "${sentence.text}"`)

      			sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)

      			console.log(`> [text-robot] Keywords: ${sentence.keywords.join(', ')}\n`)
    		}
  	}	

	async function fetchWatsonAndReturnKeywords(sentence) {

		const analyzeParams = {
  			'text': sentence,
  			'features': {
    				'keywords': {}
  			}		
		};

    		return new Promise((resolve, reject) => {
    			nlu.analyze(analyzeParams)
  			.then(analysisResults => {
    				//console.log(JSON.stringify(analysisResults, null, 2));
  				const keywords = analysisResults.result.keywords.map((keyword) => {
          				return keyword.text
        			})

        			resolve(keywords)
			})
  			.catch(err => {
    				console.log('error:', err);
  			});

		})
 	}

}

module.exports = robot
