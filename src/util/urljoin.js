// var Url = require('url-parse');

const { URL } = require('url');

function urljoin(from, to) {
	const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
	if (resolvedUrl.protocol === 'resolve:') {
		// `from` is a relative URL.
		const { pathname, search, hash } = resolvedUrl;
		return pathname + search + hash;
	}
	return resolvedUrl.toString();
}

// function urljoin2(base, url) {

// 	/* Only accept commonly trusted protocols:
// 	 * Only data-image URLs are accepted, Exotic flavours (escaped slash,
// 	 * html-entitied characters) are not supported to keep the function fast */
// 	if (/^(https?|file|ftps?|mailto|javascript|data:image\/[^;]{2,9};):/i.test(url)) {
// 		//Url is already absolute
// 	} else {
// 		var baseObj = new Url(base);
// 		if (url.startsWith('//'))
// 			url = baseObj.protocol + url;
// 		else if (url.startsWith('/'))
// 			url = baseObj.origin + url;
// 		else
// 			url = base + '/' + url;
// 	}

// 	while (/\/\.\.\//.test(url = url.replace(/[^/]+\/+\.\.\//g, '')));

// 	/* Escape certain characters to prevent XSS */
// 	url = url.replace(/\.$/, '').replace(/\/\./g, '').replace(/"/g, '%22')
// 		.replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
// 	return url;
// };

module.exports = urljoin;