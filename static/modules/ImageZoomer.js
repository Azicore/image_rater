/**
 * スマホにおける画像の拡大・縮小機能を提供するクラス
 */
export default class ImageZoomer {

	/**
	 * 拡大縮小可能な要素につけるクラス名
	 * @type {string}
	 */
	static ZOOMABLE = 'zoomable';

	/**
	 * 初期化済みかどうか
	 * @type {boolean}
	 */
	static initialized = false;

	/**
	 * コンストラクタ
	 */
	constructor() {
		/**
		 * 2本指タッチが機能するまでに必要な指の移動量
		 * @type {number}
		 */
		this.TOUCH_THRESHOLD = 20;
		/**
		 * 拡大縮小モードになるのに必要な指と指の距離の変化量
		 * @type {number}
		 */
		this.ZOOM_THRESHOLD = 5;
		/**
		 * 画像の典型的なサイズ
		 * @type {number}
		 */
		this.AVG_SIZE = 360;
		/**
		 * 拡大率の上限
		 * @type {number}
		 */
		this.MAX_ZOOM = 8;
		/**
		 * 拡大率変化率（指の移動量に応じてどれくらい拡大率を変化させるか）の係数の上限（1以上MAX_ZOOM以下）
		 * @type {number}
		 */
		this.MAX_ZOOM_SPEED_RATIO = 2;

		// 1回目の呼び出し時だけ初期化する
		if (!this.constructor.initialized) {
			this._setEventHandlers();
			this.constructor.initialized = true;
		}
	}

	/**
	 * DOMイベントを設定する
	 */
	_setEventHandlers() {
		// 現在表示中の全ての拡大縮小可能な要素
		const zoomableElements = document.getElementsByClassName(this.constructor.ZOOMABLE);

		// 2本指でのタッチ開始
		document.body.addEventListener('touchstart', (e) => {
			if (e.touches.length != 2) return;
			if (e.touches[0].target != e.touches[1].target) return;
			if (!e.touches[0].target.classList.contains(this.constructor.ZOOMABLE)) return;
			e.preventDefault();
			e.stopPropagation();
			const target = e.touches[0].target;
			const getInitialParams = () => {
				return {
					originalZoom: 1, zoom: 1,
					originalPos: [0, 0], pos: [0, 0]
				};
			}
			// 他に拡大縮小している要素があれば初期状態に戻す
			for (let i = 0; zoomableElements.length > i; i++) {
				const elem = zoomableElements[i];
				if (elem == target) continue;
				if (elem.style.transform && elem.imagerater) {
					elem.style.transform = 'none';
					Object.assign(elem.imagerater, getInitialParams());
				}
			}
			// 初めて拡大縮小する場合は初期化する
			if (!target.imagerater) {
				target.imagerater = getInitialParams();
			}
			// 必要な変数を初期化する
			Object.assign(target.imagerater, {
				startX1: e.touches[0].clientX,
				startY1: e.touches[0].clientY,
				startX2: e.touches[1].clientX,
				startY2: e.touches[1].clientY,
				isMoving: false,
				isZooming: false
			});
			// 拡大縮小中の要素を保持しておく
			document.body.imageraterTarget = target;
		});

		// 2本指でのタッチ移動
		document.body.addEventListener('touchmove', (e) => {
			if (e.touches.length != 2) return;
			if (!document.body.imageraterTarget) return;
			e.preventDefault();
			e.stopPropagation();
			const o = document.body.imageraterTarget.imagerater;
			// 1つ目の指の座標
			const [x1, y1] = [e.touches[0].clientX, e.touches[0].clientY];
			// 2つ目の指の座標
			const [x2, y2] = [e.touches[1].clientX, e.touches[1].clientY];
			// タッチ開始時の指と指の距離
			const sd = Math.sqrt(Math.pow(o.startX1 - o.startX2, 2) + Math.pow(o.startY1 - o.startY2, 2));
			// 現在の指と指の距離
			const d = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
			// 移動モードの場合
			if (o.isMoving) {
				o.pos = [
					o.originalPos[0] + (x1 - o.startX1) / o.zoom,
					o.originalPos[1] + (y1 - o.startY1) / o.zoom
				];
			// 拡大縮小モードの場合
			} else if (o.isZooming) {
				const zoom = (d - sd) / (this.AVG_SIZE / 2) * Math.min(o.originalZoom, this.MAX_ZOOM_SPEED_RATIO);
				// 「(d - sd)」              … 指と指の距離の変化量で、拡大率の変化量を決める
				// 「/ (this.AGV_SIZE / 2)」 … 典型的な画像サイズの規模に応じて変化量を抑える
				// 「* o.originalZoom」      … 拡大率に応じて変化量を増やす（拡大しているときは同じ動きでも変化量を増やす）
				o.zoom = Math.min(this.MAX_ZOOM, Math.max(1, o.originalZoom + zoom));
			// モード未定の場合
			} else {
				// 移動量が少ない場合は何もしない
				if (this.TOUCH_THRESHOLD > Math.abs(x1 - o.startX1) + Math.abs(y1 - o.startY1) + Math.abs(x2 - o.startX2) + Math.abs(y2 - o.startY2)) return;
				// 移動量が閾値を超えている場合、指と指の距離の変化量によって移動モードか拡大縮小モードかを決定する
				o.isMoving = this.ZOOM_THRESHOLD > Math.abs(d - sd);
				o.isZooming = !o.isMoving;
			}
			// 元の大きさに戻った場合は位置も元に戻す
			if (o.zoom == 1) o.pos = [0, 0];
			// CSSのtransformを設定する
			document.body.imageraterTarget.style.transform = o.zoom == 1 ? 'none' : `scale(${o.zoom}) translate(${o.pos[0]}px, ${o.pos[1]}px)`;
		});

		// 2本指でのタッチ終了
		document.body.addEventListener('touchend', (e) => {
			if (!document.body.imageraterTarget) return;
			const o = document.body.imageraterTarget.imagerater;
			// 現在の拡大率と位置を次の基準とする
			o.originalZoom = o.zoom;
			o.originalPos = o.pos;
			document.body.imageraterTarget = null;
		});

	}

}
