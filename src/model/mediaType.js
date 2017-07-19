//@flow

class MediaType {
	mimeTypes: string[]; // consumes + produces
	consumes: string[];
	produces: string[];
}

module.exports = MediaType;