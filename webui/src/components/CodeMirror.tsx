import { EditorView } from 'codemirror';
import { JSX, onCleanup, splitProps } from 'solid-js';

export type EditorViewConfig = ConstructorParameters<typeof EditorView>[0];

export default (props: { config: EditorViewConfig } & JSX.HTMLAttributes<HTMLDivElement>) => {
  const [local, other] = splitProps(props, ['config']);

  let editor: EditorView | null = null;
  onCleanup(() => editor.destroy());
  return <div ref={(el) => editor = new EditorView({
    ...local.config,
    parent: el
  })} {...other}/>;
};