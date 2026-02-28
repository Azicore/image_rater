import sharp from 'sharp';

/**
 * 画像ファイル・動画ファイルを扱うクラス
 */
export default class MediaFile {

	/**
	 * コンストラクタ
	 * @param {string} filePath - ファイルパス
	 */
	constructor(filePath) {
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
	async getSize() {
		if (!this._metadata) {
			this._metadata = await sharp(this.filePath).metadata();
			console.log(`getSize: ${this.filePath}`);
		}
		return this._metadata;
	}

	/**
	 * 画像のサムネイルを作成する
	 * @param {string} outputPath - 作成先のパス
	 * @param {number} thumbWidth - サムネイルの幅
	 * @param {number} thumbHeight - サムネイルの高さ
	 */
	async createThumbnail(outputPath, thumbWidth, thumbHeight) {
		console.log(`createThumbnail: ${this.filePath}`);
		await sharp(this.filePath).resize(thumbWidth, thumbHeight).webp({ quality: 80 }).toFile(outputPath);
	}

}
