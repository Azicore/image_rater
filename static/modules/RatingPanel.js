import EventDispatchable from './EventDispatchable.js';
import KeyEventManager from './KeyEventManager.js';
import HtmlGenerator from './HtmlGenerator.js';
import FileInfo from './FileInfo.js';
import API from './API.js';

/**
 * レーティング画面を表すクラス
 */
export default class RatingPanel extends EventDispatchable {
	
	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('rating');
		/**
		 * レーティングボタンの要素
		 * @type {HTMLElement}
		 */
		this.elRatingButton = document.getElementById('rating_button');
		/**
		 * ファイル情報を表示するブロック要素
		 * @type {HTMLElement}
		 */
		this.elRatingProperty = document.getElementById('rating_property');
		/**
		 * 1つ目のファイルを表示するブロック要素
		 * @type {HTMLElement}
		 */
		this.elRatingImage1 = document.getElementById('rating_image_1');
		/**
		 * 2つ目のファイルを表示するブロック要素
		 * @type {HTMLElement}
		 */
		this.elRatingImage2 = document.getElementById('rating_image_2');
		/**
		 * スキップボタンの要素
		 * @type {HTMLElement}
		 */
		this.elRatingSkip = document.getElementById('rating_skip');
		/**
		 * 終了ボタンの要素
		 * @type {HTMLElement}
		 */
		this.elRatingClose = document.getElementById('rating_close');
		/**
		 * サブディレクトリ情報オブジェクト
		 * @type {SubdirectoryInfo}
		 */
		this.subdir = null;
		/**
		 * 1つ目のファイル
		 * @type {FileInfo}
		 */
		this.file1 = null;
		/**
		 * 2つ目のファイル
		 * @type {FileInfo}
		 */
		this.file2 = null;
		/**
		 * 1つ目の動画の要素
		 * @type {HTMLVideoElement}
		 */
		this.video1 = null;
		/**
		 * 2つ目の動画の要素
		 * @type {HTMLVideoElement}
		 */
		this.video2 = null;
		/**
		 * ファイル情報表示の定義
		 * @type {object[]}
		 */
		this.propDefs = [
			// title：表示名 / key：比較に使う値のキー / format：表示に使う値のキー
			{ title: 'レーティング',   key: 'r', format: 'rating' },
			{ title: '画像サイズ',     key: 'd', format: 'mediaSize' },
			{ title: 'ファイルサイズ', key: 's', format: 'fileSize' },
			{ title: '更新日時',       key: 'm', format: 'date' }
		];

		this.container.style.display = 'none';
		this.toggleRatingButton(false);
		this._defineEvents('open', 'close');
		this._setEventHandlers();
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		// レーティングボタン
		this.elRatingButton.addEventListener('click', () => {
			if (this.elRatingButton.classList.contains('rating_button_disabled')) return;
			this.open();
		});
		// 1つ目のファイルを選択
		this.elRatingImage1.addEventListener('click', () => {
			this.next(this.file1.id, this.file2.id);
		});
		// 2つ目のファイルを選択
		this.elRatingImage2.addEventListener('click', () => {
			this.next(this.file2.id, this.file1.id);
		});
		// スキップボタン
		this.elRatingSkip.addEventListener('click', () => {
			this.next();
		});
		// 終了ボタン
		this.elRatingClose.addEventListener('click', () => {
			this.close();
		});
		// キーボード操作
		KeyEventManager.addHandler('rating', (e) => {
			// レーティングを終了する
			if (e.code == 'Backspace' || e.code == 'Escape') {
				this.close();
			// 1つ目のファイルを選択（←）
			} else if (e.code == 'ArrowLeft') {
				this.next(this.file1.id, this.file2.id);
			// 2つ目のファイルを選択（→）
			} else if (e.code == 'ArrowRight') {
				this.next(this.file2.id, this.file1.id);
			// スキップ（S）
			} else if (e.code == 'KeyS') {
				this.next();
			// 1つ目の動画の再生と早送り（Z、X）
			} else if (e.code == 'KeyZ' || e.code == 'KeyX') {
				if (!this.video1) return;
				if (this.video2) this.video2.pause();
				if (this.video1.paused) {
					this.video1.play();
				} else {
					this.video1.currentTime += 5 * (e.code == 'KeyZ' ? -1 : 1);
				}
			// 2つ目の動画の再生と早送り（<、>）
			} else if (e.code == 'Comma' || e.code == 'Period') {
				if (!this.video2) return;
				if (this.video1) this.video1.pause();
				if (this.video2.paused) {
					this.video2.play();
				} else {
					this.video2.currentTime += 5 * (e.code == 'Comma' ? -1 : 1);
				}
			}
		});
	}

	/**
	 * サブディレクトリの情報を渡す
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 */
	setSubdir(subdir) {
		this.subdir = subdir;
	}

	/**
	 * レーティングボタンの有効・無効を切り替える
	 * @param {boolean} toggle - 有効にするかどうか
	 */
	toggleRatingButton(toggle) {
		this.elRatingButton.classList.toggle('rating_button_disabled', !toggle);
		if (toggle) {
			this.elRatingButton.removeAttribute('title');
		} else {
			this.elRatingButton.setAttribute('title', 'レーティングを行うにはディレクトリを選択して下さい。');
		}
	}

	/**
	 * レーティング画面を開く
	 */
	async open() {
		this.container.style.display = 'flex';
		this.next();
		this.trigger('open');
		try {
			await this.container.requestFullscreen();
		} catch (e) { }
	}

	/**
	 * レーティングを行ない次の候補を表示する
	 * @param {string} winnerFileId - 勝利したファイルのファイルID
	 * @param {string} loserFileId - 敗北したファイルのファイルID
	 */
	async next(winnerFileId, loserFileId) {
		const HTML = HtmlGenerator;
		this.container.classList.add('loading');
		const [file1, file2] = (await API.rating(this.subdir, winnerFileId, loserFileId)).map(file => new FileInfo(file));
		if (!file1 || !file2) {
			this.close();
			return;
		}
		this.container.classList.remove('loading');
		this.file1 = file1;
		this.file2 = file2;
		const url1 = API.getFileURL(this.subdir.dirId, this.subdir.subdirName, file1.n);
		const url2 = API.getFileURL(this.subdir.dirId, this.subdir.subdirName, file2.n);
		this._stopVideo();
		// 1つ目のファイル
		if (file1.isVideo) {
			this.video1 = HTML.video.attr({ src: url1, title: file1.n, controls: 'controls' }).end();
			this.video1.addEventListener('mouseenter', () => {
				if (this.video2) this.video2.pause();
				if (this.video1.paused) this.video1.play();
			});
			this.elRatingImage1.replaceChildren(this.video1);
		} else {
			const elem = HTML.img.attr({ src: url1, alt: file1.n, title: file1.n }).end();
			this.elRatingImage1.replaceChildren(elem);
		}
		// 2つ目のファイル
		if (file2.isVideo) {
			this.video2 = HTML.video.attr({ src: url2, title: file2.n, controls: 'controls' }).end();
			this.video2.addEventListener('mouseenter', () => {
				if (this.video1) this.video1.pause();
				if (this.video2.paused) this.video2.play();
			});
			this.elRatingImage2.replaceChildren(this.video2);
		} else {
			const elem = HTML.img.attr({ src: url2, alt: file2.n, title: file2.n }).end();
			this.elRatingImage2.replaceChildren(elem);
		}
		// ファイルの情報
		this.elRatingProperty.innerHTML = '';
		for (const { title, key, format } of this.propDefs) {
			const [cls1, cls2] = file1[key] >= file2[key] ? ['rating_property_winner', 'rating_property_loser'] : ['rating_property_loser', 'rating_property_winner'];
			this.elRatingProperty.appendChild(HTML.tr.end(
				HTML.td.cls(['rating_property_1', cls1]).end(file1[format]),
				HTML.th.end(title),
				HTML.td.cls(['rating_property_2', cls2]).end(file2[format])
			));
		}
	}

	/**
	 * レーティング画面を閉じる
	 */
	async close() {
		this._stopVideo();
		this.elRatingProperty.innerHTML = '';
		this.elRatingImage1.innerHTML = '';
		this.elRatingImage2.innerHTML = '';
		this.container.style.display = 'none';
		this.trigger('close', this.subdir);
		try {
			await document.exitFullscreen();
		} catch (e) { }
	}

	/**
	 * 動画再生を停止する
	 */
	_stopVideo() {
		if (this.video1) {
			let video = this.video1;
			video.pause();
			setTimeout(() => {
				video.pause();
				video = null;
			}, 1000);
			this.video1 = null;
		}
		if (this.video2) {
			let video = this.video2;
			video.pause();
			setTimeout(() => {
				video.pause();
				video = null;
			}, 1000);
			this.video2 = null;
		}
	}

}
