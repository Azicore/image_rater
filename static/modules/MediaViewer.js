import EventDispatchable from './EventDispatchable.js';
import KeyEventManager from './KeyEventManager.js';
import HtmlGenerator from './HtmlGenerator.js';
import API from './API.js';

/**
 * ビューアを表すクラス
 */
export default class MediaViewer extends EventDispatchable {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * メイン要素
		 * @type {HTMLElement}
		 */
		this.container = document.getElementById('viewer');
		/**
		 * 動画の場合の<video>要素（再生制御用）
		 * @type {HTMLVideoElement}
		 */
		this.video = null;

		this._defineEvents('close');
		this._setEventHandlers();
		this.container.style.display = 'none';
		this.container.innerHTML = '';
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.container.addEventListener('click', (e) => {
			// クリックしたら閉じる
			this.close();
		});
		this.container.addEventListener('fullscreenchange', (e) => {
			// フルスクリーンを終了したら閉じる
			if (!document.fullscreenElement) {
				this.close();
			}
		});
		// キーボード操作
		KeyEventManager.addHandler('viewer', (e) => {
			// ビューアを閉じる
			if (e.code == 'Backspace' || e.code == 'Escape') {
				this.close();
			// 再生と早送り
			} else if (e.code == 'KeyZ' || e.code == 'KeyX' || e.code == 'Comma' || e.code == 'Period') {
				if (!this.video) return;
				if (this.video.paused) {
					this.video.play();
				} else {
					this.video.currentTime += 5 * (e.code == 'KeyZ' || e.code == 'Comma' ? -1 : 1);
				}
			}
		});
	}

	/**
	 * ビューアでメディアを開く
	 * @param {SubdirectoryInfo} subdir - サブディレクトリ情報オブジェクト
	 * @param {FileInfo} file - ファイル情報オブジェクト
	 */
	async open(subdir, file) {
		const HTML = HtmlGenerator;
		const { dirId, subdirName } = subdir;
		const url = API.getFileURL(dirId, subdirName, file.n);
		this._stopVideo();
		if (file.isVideo) {
			this.video = HTML.video.attr({ src: url, title: file.n, controls: 'controls' }).end();
			this.video.addEventListener('mouseenter', () => {
				if (this.video.paused) this.video.play();
			});
			this.container.replaceChildren(this.video);
		} else {
			const elem = HTML.img.attr({ src: url, alt: file.n, title: file.n }).end();
			this.container.replaceChildren(elem);
		}
		this.container.style.display = 'flex';
		try {
			await this.container.requestFullscreen();
		} catch (e) { }
	}

	/**
	 * ビューアを閉じる
	 */
	async close() {
		this._stopVideo();
		this.container.style.display = 'none';
		this.container.innerHTML = '';
		this.trigger('close');
		try {
			await document.exitFullscreen();
		} catch (e) { }
	}

	/**
	 * 動画再生を停止する
	 */
	_stopVideo() {
		if (!this.video) return;
		let video = this.video;
		video.pause();
		setTimeout(() => {
			video.pause(); // ※なぜか一度では止まらないことが多いため、時間差でもう一度呼ぶ。
			video = null;
		}, 1000);
		this.video = null;
	}

}
