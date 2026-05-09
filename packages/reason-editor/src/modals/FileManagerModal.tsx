"use client";

import { Filemanager, Willow } from "@svar-ui/react-filemanager";
import "@svar-ui/react-filemanager/all.css";
import {
  Dialog,
  DialogContent
} from "../ui/dialog";
import { getData, getPathToDocIdMap } from "./filemanager-data";
import { defaultDocuments } from "../documents/defaultDocuments";
import type { Document } from "../documents/DocumentTree";

interface FileManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents?: Document[];
  onSelectDocument?: (docId: string) => void;
}

export function FileManagerModal({
  open,
  onOpenChange,
  documents = defaultDocuments,
  onSelectDocument,
}: FileManagerModalProps) {
  const data = getData(documents).map((item) => ({
    id: item.id,
    type: item.type,
    size: item.size ?? 0,
    date: item.date ?? new Date(),
  }));

  const pathToDocId = getPathToDocIdMap(documents);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden sm:!max-w-[98vw] !duration-0 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 data-[state=open]:!animate-none data-[state=closed]:!animate-none">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-[92vh] min-h-[300px] rounded-md overflow-hidden">
            <Willow>
              <Filemanager
                data={data}
                mode="table"
                init={(api) => {
                  api.on("open-file", ({ id }: { id: string }) => {
                    const docId = pathToDocId.get(id);
                    if (docId && onSelectDocument) {
                      onSelectDocument(docId);
                      onOpenChange(false);
                    }
                  });
                }}
              />
            </Willow>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
