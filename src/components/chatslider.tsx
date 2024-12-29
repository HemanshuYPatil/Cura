import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryIcon, TrashIcon } from 'lucide-react'

interface ChatSidebarProps {
  chatHistory: { id: string; title: string }[]
  onChatSelect: (id: string) => void
  onClearChats: () => void
}

export function ChatSidebar({ chatHistory, onChatSelect, onClearChats }: ChatSidebarProps) {
  return (
    <div className="w-64 bg-gray-100 h-full flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Chat History</h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {chatHistory.map((chat) => (
            <Button
              key={chat.id}
              variant="ghost"
              className="w-full justify-start mb-2"
              onClick={() => onChatSelect(chat.id)}
            >
              <HistoryIcon className="mr-2 h-4 w-4" />
              {chat.title}
            </Button>
          ))}
        </ScrollArea>
      </div>
      <div className="mt-auto p-4">
        <Button variant="outline" className="w-full" onClick={onClearChats}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Clear Chats
        </Button>
      </div>
    </div>
  )
}

