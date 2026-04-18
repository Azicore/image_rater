import fs from 'fs';
import { execFile } from 'child_process';
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

	/**
	 * 画像ファイルかどうかを返す
	 * @return {boolean} 対応画像ファイルならtrue
	 */
	get isImage() {
		return /\.(?:jpg|jpeg?|png|gif|bmp|svg|webp)$/i.test(this.filePath);
	}

	/**
	 * 動画ファイルかどうかを返す
	 * @return {boolean} 対応動画ファイルならtrue
	 */
	get isVideo() {
		return /\.mp4$/i.test(this.filePath);
	}

	/**
	 * 外部コマンドを実行する
	 * @param {string[]} args - コマンドと引数
	 * @return {object} 実行結果
	 */
	_execCommand(args) {
		return new Promise((resolve, reject) => {
			const cmd = args.shift();
			execFile(cmd, args, (err, stdout) => {
				try {
					resolve(JSON.parse(stdout));
				} catch (e) {
					resolve();
				}
			});
		});
	}

	/**
	 * 画像のサイズを返す
	 * @return {object} width・heightを持つオブジェクト
	 */
	async getSize() {
		if (!this._metadata) {
			console.log(`getSize: ${this.filePath}`);
			if (this.isVideo) {
				const args = ['ffprobe', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', this.filePath];
				this._metadata = (await this._execCommand(args))?.streams?.[0] || {};
			} else {
				this._metadata = await sharp(this.filePath).metadata();
			}
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
		if (this.isVideo) {
			const args = ['ffmpeg', '-ss', '2', '-y', '-i', this.filePath, '-frames:v', '1', '-vf', `scale=${thumbWidth}:${thumbHeight}`, outputPath];
			await this._execCommand(args);
		} else {
			// ※sharpにfilePathを直接渡すと内部でロックが解放されなくなることがあるため、代わりに事前にreadFileで取得したBufferを渡す。
			const buf = await fs.promises.readFile(this.filePath);
			await sharp(buf).resize(thumbWidth, thumbHeight).webp({ quality: 80 }).toFile(outputPath);
		}
	}

}
