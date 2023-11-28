import {Element, element, stringAttribute, type ElementAttributes} from '@lume/element'
import html from 'solid-js/html'
import {createEffect} from 'solid-js'

export class OutputViewErrorEvent extends ErrorEvent {
	error
	constructor(error: unknown) {
		super('error', {})
		this.error = error
	}
}

type OutputViewAttributes = 'value' | 'mode'

export
@element('output-view')
class OutputView extends Element {
	hasShadow = false

	@stringAttribute value = ''
	@stringAttribute mode: 'script>iframe' | 'html>iframe' = 'html>iframe'

	#iframe!: HTMLIFrameElement

	connectedCallback() {
		super.connectedCallback()

		createEffect(() => {
			this.value
			this.#renderCode()
		})

		window.addEventListener('message', this.#handleMessage)
	}

	#handleError(error: unknown) {
		this.dispatchEvent(new OutputViewErrorEvent(error))
	}

	#handleMessage = (msg: MessageEvent<{error: unknown}>) => {
		console.log('MESSAGE >>>>>>>>>', msg)

		if (!(this.#iframe && msg.source === this.#iframe.contentWindow)) return

		if (msg.data && msg.data.error) {
			this.#handleError(msg.data.error)
		}
	}

	#renderCode() {
		switch (this.mode) {
			case 'script>iframe': {
				const html = URL.createObjectURL(
					new Blob(
						[
							/*html*/ `<html>
									<head></head>
									<body>
										<script>${iframeErrorHandler.toString()}</script>
										<script>
										${this.value}
										</script>
									</body>
								</html>`,
						],
						{type: 'text/html'},
					),
				)

				this.#iframe.src = html

				break
			}

			case 'html>iframe': {
				const html = URL.createObjectURL(
					new Blob([/*html*/ `<script>${iframeErrorHandler.toString()}</script>` + this.value], {
						type: 'text/html',
					}),
				)

				this.#iframe.src = html

				break
			}
		}
	}

	template = () => html`
		<div class="live-code-preview">
			<iframe ref=${(e: HTMLIFrameElement) => (this.#iframe = e)}></iframe>
		</div>
	`

	css = /*css*/ `
		:host { display: contents; }

		.live-code-preview iframe {
			display: block;
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			border: none;
		}

		.live-code-preview div {
			height: 100%;
		}

		.hidden {
			display: none !important;
		}
	`
}

declare module 'solid-js' {
	namespace JSX {
		interface IntrinsicElements {
			'output-view': ElementAttributes<OutputView, OutputViewAttributes>
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'output-view': OutputView
	}
}

const iframeErrorHandler = /*js*/ `
	function onError(e) {
		console.error('Error in <live-code> iframe:', e)

		let error;

		if (
			window.PromiseRejectionEvent &&
			e instanceof PromiseRejectionEvent
		) {
			if (e.reason instanceof Error) {
				error = {
					message: e.reason.message,
					stack: e.reason.stack
				};
			} else {
				error = {
					message: e.reason
				};
			}
		} else if (e.error) {
			error = {
				message: e.error.message,
				stack: e.error.stack
			};
		} else {
			error = {
				message: e.message
			};
		}

		const parentWindow = window.parent || window.opener;

		parentWindow.postMessage({ error });
	}

	window.addEventListener("error", onError);
	window.addEventListener("unhandledrejection", onError);
`
