// ============================================================================
// DmPage - Direct Messages Page (Modular Version)
// ============================================================================
// Uses modular hooks and components for maintainability.
// Original: 662 lines → Refactored: ~80 lines

import { useDmSelection, useDmMessages } from "./hooks";
import { ConversationList, DmChatArea, NewConversationModal } from "./components";

export function DmPage() {
  // Selection hook: conversations, search, new conversation
  const selection = useDmSelection();

  // Messages hook: messages, send/edit/delete, typing
  const messages = useDmMessages({
    conversationId: selection.selectedConvoId,
    onError: selection.setError,
  });

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Conversation List Sidebar */}
      <ConversationList
        conversations={selection.conversations}
        loading={selection.conversationsLoading}
        selectedId={selection.selectedConvoId}
        onSelect={selection.selectConversation}
        onNewConversation={() => selection.setShowNewConvoModal(true)}
      />

      {/* Chat Area */}
      {selection.selectedConvoId && selection.selectedConversation ? (
        <DmChatArea
          conversation={selection.selectedConversation}
          messages={messages.messages}
          messagesLoading={messages.messagesLoading}
          sending={messages.sending}
          messageText={messages.messageText}
          messagesEndRef={messages.messagesEndRef}
          typingUsers={messages.typingUsers}
          onMessageChange={messages.setMessageText}
          onSend={messages.handleSend}
          onTyping={messages.handleTyping}
          onEditMessage={messages.handleEdit}
          onDeleteMessage={messages.handleDelete}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">Bir konuşma seçin</p>
            <p className="text-sm mt-1">veya yeni bir konuşma başlatın</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {selection.error && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <span>{selection.error}</span>
          <button onClick={() => selection.setError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={selection.showNewConvoModal}
        onClose={() => selection.setShowNewConvoModal(false)}
        searchQuery={selection.searchQuery}
        onSearchChange={selection.setSearchQuery}
        searchResults={selection.searchResults}
        searching={selection.searching}
        onSelectUser={selection.startConversation}
      />
    </div>
  );
}
