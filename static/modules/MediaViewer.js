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
		/**
		 * モバイル表示かどうか
		 * @type {boolean}
		 */
		this.isMobile = false;

		this._defineEvents('close', 'flick');
		this._setEventHandlers();
		this.container.style.display = 'none';
		this.container.innerHTML = '';
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		this.container.addEventListener('click', (e) => {
			if (this.isMobile) return;
			// クリックしたら閉じる
			this.close();
		});
		this.container.addEventListener('fullscreenchange', (e) => {
			// フルスクリーンを終了したら閉じる
			if (!document.fullscreenElement) {
				this.close();
			}
		});
		// タッチ操作
		let flickStartPoint = null;
		let flickEndPoint = null;
		let FLICK_LIMIT = 50;
		let FLICK_THRESHOLD = 150;
		this.container.addEventListener('touchstart', (e) => {
			e = e.touches[0];
			flickStartPoint = [e.clientX, e.clientY];
			flickEndPoint = null;
		});
		this.container.addEventListener('touchmove', (e) => {
			e = e.touches[0];
			flickEndPoint = [e.clientX, e.clientY];
		});
		this.container.addEventListener('touchend', (e) => {
			if (!flickStartPoint || !flickEndPoint) return;
			const flickX = flickEndPoint[0] - flickStartPoint[0];
			const flickY = flickEndPoint[1] - flickStartPoint[1];
			// 横フリックで前後のファイル
			if (FLICK_LIMIT > Math.abs(flickY)) {
				if (flickX > FLICK_THRESHOLD) {
					this.trigger('flick', false);
				} else if (-FLICK_THRESHOLD > flickX) {
					this.trigger('flick', true);
				}
			// 縦フリックで終了
			} else if (FLICK_LIMIT > Math.abs(flickX)) {
				if (Math.abs(flickY) > FLICK_THRESHOLD) {
					this.close();
				}
			}
			flickStartPoint = null;
			flickEndPoint = null;
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
