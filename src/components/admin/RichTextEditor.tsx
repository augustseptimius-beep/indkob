import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Link, Heading2, Heading3, Minus, Undo, Redo, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  availableVariables?: Array<{ key: string; desc: string }>;
}

export function RichTextEditor({ value, onChange, placeholder, className, availableVariables }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync value from outside only when not actively editing
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const execCmd = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt('Indtast URL:');
    if (url) {
      execCmd('createLink', url);
    }
  }, [execCmd]);

  const insertVariable = useCallback((varKey: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, varKey);
    handleInput();
  }, [handleInput]);

  const toolbarButtons = [
    { icon: Type, label: 'Normal tekst', action: () => execCmd('formatBlock', 'p') },
    { icon: Heading2, label: 'Overskrift 2', action: () => execCmd('formatBlock', 'h2') },
    { icon: Heading3, label: 'Overskrift 3', action: () => execCmd('formatBlock', 'h3') },
    { type: 'separator' as const },
    { icon: Bold, label: 'Fed', action: () => execCmd('bold') },
    { icon: Italic, label: 'Kursiv', action: () => execCmd('italic') },
    { type: 'separator' as const },
    { icon: List, label: 'Punktliste', action: () => execCmd('insertUnorderedList') },
    { icon: ListOrdered, label: 'Nummereret liste', action: () => execCmd('insertOrderedList') },
    { type: 'separator' as const },
    { icon: Link, label: 'Indsæt link', action: insertLink },
    { icon: Minus, label: 'Vandret linje', action: () => execCmd('insertHorizontalRule') },
    { type: 'separator' as const },
    { icon: Undo, label: 'Fortryd', action: () => execCmd('undo') },
    { icon: Redo, label: 'Gentag', action: () => execCmd('redo') },
  ];

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-0.5 p-1.5 border-b bg-muted/30 flex-wrap">
          {toolbarButtons.map((btn, i) => {
            if ('type' in btn && btn.type === 'separator') {
              return <div key={i} className="w-px h-6 bg-border mx-1" />;
            }
            const { icon: Icon, label, action } = btn as { icon: any; label: string; action: () => void };
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.preventDefault(); action(); }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Variable insertion dropdown */}
          {availableVariables && availableVariables.length > 0 && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <div className="relative group">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                >
                  {`{{ }}`} Variabel
                </Button>
                <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md hidden group-hover:block z-50 min-w-[200px]">
                  {availableVariables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertVariable(v.key);
                      }}
                    >
                      <code className="text-xs bg-muted px-1 rounded">{v.key}</code>
                      <span className="text-xs text-muted-foreground">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </TooltipProvider>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[200px] p-4 text-sm focus:outline-none prose prose-sm max-w-none
          [&_p]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_a]:text-primary [&_a]:underline
          [&_hr]:my-4 [&_hr]:border-border"
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}
