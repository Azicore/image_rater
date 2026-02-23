import sharp from 'sharp';

/**
 * 画像ファイル・動画ファイルを扱うクラス
 */
export default class MediaFile {

	/**
	 * コンストラクタ
	 * @param {string} filePath - ファイルパス
	 */
	constructor(filePath, info) {
		/**
		 * ファイルパス
		 * @type {string}
		 */
		this.filePath = filePath;
	}

	get isImage() {
		return /\.(?:jpe?g|jpe|png|gif|webp)$/i.test(this.filePath);
	}

	get isVideo() {
		return /\.(?:mp4|mpg)$/i.test(this.filePath);
	}

	/**
	 * 画像のサイズを返す
	 * @return {object} width・heightを持つオブジェクト
	 */
	async getSize(additionalInfo = {}) {
		if (!this._metadata) {
			this._metadata = await sharp(this.filePath).metadata();
			console.log(`getSize: ${this.filePath}`);
		}
		return Object.assign({}, additionalInfo, this._metadata);
	}

	async createThumbnail(outputPath, width, height) {
		console.log(`createThumbnail: ${this.filePath}`);
		await sharp(this.filePath).resize(width, height).webp({ quality: 80 }).toFile(outputPath);
	}

}
