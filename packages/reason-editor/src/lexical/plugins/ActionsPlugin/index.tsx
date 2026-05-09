/**
 * @fileoverview Plugin for editor-level actions such as import/export, clearing the editor,
 * and sharing the document.
 */

import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';

import { editorStateFromSerializedDocument } from '@lexical/file';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND } from '@lexical/yjs';
import {
  $getRoot,
  $isParagraphNode,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_EDITOR,
  HISTORIC_TAG,
} from 'lexical';
import { useEffect, useState } from 'react';
import { SHORTCUTS } from '../ShortcutsPlugin/shortcuts';

import { INITIAL_SETTINGS } from '../../context/appSettings';
import { useSettings } from '../../context/SettingsContext';
import useFlashMessage from '../../hooks/useFlashMessage';
import useModal from '../../hooks/useModal';
import Button from '../../ui/Button';
import Icon from '../../ui/Icon';
import { Button as ShadcnButton } from '../../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';
import { docFromHash } from '../../utils/docSerialization';
import {
  SPEECH_TO_TEXT_COMMAND,
  SUPPORT_SPEECH_RECOGNITION,
} from '../SpeechToTextPlugin';
import { SHOW_VERSIONS_COMMAND } from '../VersionsPlugin';
import ExportDropdown from './ExportDropdown';
import { validateEditorState } from './utils';

/**
 * Plugin that renders a set of action buttons (Import, Export, Share, etc.).
 * @param {Object} props - Component props.
 * @param {boolean} props.shouldPreserveNewLinesInMarkdown - Settings for markdown conversion.
 * @param {boolean} props.useCollabV2 - Whether to use collaboration version 2.
 * @returns {JSX.Element} The rendered actions toolbar buttons.
 */
export default function ActionsPlugin({
  shouldPreserveNewLinesInMarkdown,
  useCollabV2,
}: {
  shouldPreserveNewLinesInMarkdown: boolean;
  useCollabV2: boolean;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [modal, showModal] = useModal();
  const showFlashMessage = useFlashMessage();
  const { isCollabActive } = useCollaborationContext();
  const {
    settings: { showTableOfContents },
    setOption,
  } = useSettings();
  useEffect(() => {
    if (INITIAL_SETTINGS.isCollab) {
      return;
    }
    docFromHash(window.location.hash).then((doc) => {
      if (doc && doc.source === 'Playground') {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      }
    });
  }, [editor]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'x' && SUPPORT_SPEECH_RECOGNITION) {
        event.preventDefault();
        editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
        setIsSpeechToText(!isSpeechToText);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return mergeRegister(
      () => window.removeEventListener('keydown', handleKeyDown),
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      editor.registerCommand<boolean>(
        CONNECTED_COMMAND,
        (payload) => {
          const isConnected = payload;
          setConnected(isConnected);
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor, isSpeechToText]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    return editor.registerUpdateListener(
      ({ dirtyElements, prevEditorState, tags }) => {
        // If we are in read only mode, send the editor state
        // to server and ask for validation if possible.
        if (
          !isEditable &&
          dirtyElements.size > 0 &&
          !tags.has(HISTORIC_TAG) &&
          !tags.has(COLLABORATION_TAG)
        ) {
          validateEditorState(editor);
        }
        // Debounce the isEmpty check so it doesn't run on every keystroke
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
          editor.getEditorState().read(() => {
            const root = $getRoot();
            const children = root.getChildren();

            if (children.length > 1) {
              setIsEditorEmpty(false);
            } else {
              if ($isParagraphNode(children[0])) {
                const paragraphChildren = children[0].getChildren();
                setIsEditorEmpty(paragraphChildren.length === 0);
              } else {
                setIsEditorEmpty(false);
              }
            }
          });
        }, 1000);
      },
    );
  }, [editor, isEditable]);

  return (
    <>
      {SUPPORT_SPEECH_RECOGNITION && (
        <Tooltip>
          <TooltipTrigger asChild>
            <ShadcnButton
              variant={isSpeechToText ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
                setIsSpeechToText(!isSpeechToText);
              }}
              aria-label={`${isSpeechToText ? 'Disable' : 'Enable'} speech to text`}>
              <Icon name="mic" />
            </ShadcnButton>
          </TooltipTrigger>
          <TooltipContent>
            {isSpeechToText ? 'Disable' : 'Enable'} speech to text ({SHORTCUTS.VOICE_INPUT})
          </TooltipContent>
        </Tooltip>
      )}

      <ExportDropdown
        editor={editor}
        shouldPreserveNewLinesInMarkdown={shouldPreserveNewLinesInMarkdown}
        showFlashMessage={showFlashMessage}
        showModal={showModal}
      />

      {/* <button
        className="action-button share"
        disabled={isCollabActive || INITIAL_SETTINGS.isCollab}
        onClick={() =>
          shareDoc(
            serializedDocumentFromEditorState(editor.getEditorState(), {
              source: 'Playground',
            }),
          ).then(
            () => showFlashMessage('URL copied to clipboard'),
            () => showFlashMessage('URL could not be copied to clipboard'),
          )
        }
        title="Share"
        aria-label="Share Playground link to current editor state">
        <Icon name="send" />
      </button> */}

      {/* <button
        className={`action-button ${showTableOfContents ? 'active' : ''}`}
        onClick={() => {
          setOption('showTableOfContents', !showTableOfContents);
        }}
        title="Table of Contents"
        aria-label={`${showTableOfContents ? 'Hide' : 'Show'} table of contents`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <List size={18} strokeWidth={2} style={{ opacity: showTableOfContents ? 1 : 0.6 }} />
      </button> */}
      {isCollabActive && (
        <>
          <button
            className="action-button connect"
            onClick={() => {
              editor.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected);
            }}
            title={`${connected ? 'Disconnect' : 'Connect'
              } Collaborative Editing`}
            aria-label={`${connected ? 'Disconnect from' : 'Connect to'
              } a collaborative editing server`}>
            <Icon name={connected ? 'plug' : 'plug-fill'} />
          </button>
          {useCollabV2 && (
            <button
              className="action-button versions"
              onClick={() => {
                editor.dispatchCommand(SHOW_VERSIONS_COMMAND, undefined);
              }}>
              <Icon name="clock" />
            </button>
          )}
        </>
      )}
      {modal}
    </>
  );
}

/**
 * Dialog for confirming the clearing of the editor content.
 * @param {Object} props - Component props.
 * @param {LexicalEditor} props.editor - The editor instance.
 * @param {() => void} props.onClose - Callback to close the dialog.
 * @returns {JSX.Element} The rendered clear editor dialog.
 */
function ShowClearDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      Are you sure you want to clear the editor?
      <div className="Modal__content">
        <Button
          onClick={() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            editor.focus();
            onClose();
          }}>
          Clear
        </Button>{' '}
        <Button
          onClick={() => {
            editor.focus();
            onClose();
          }}>
          Cancel
        </Button>
      </div>
    </>
  );
}
