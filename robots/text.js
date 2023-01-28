const wiki = require('wikipedia')
const sentenceBoundaryDetection = require('sbd')

async function robot(content) {
	
	await fetchContentFromWikipedia(content)
	sanitizeContent(content)
	breakContentIntoSentences(content)
	
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

}

module.exports = robot
