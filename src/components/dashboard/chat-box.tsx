"use client";

import { createMessages } from "@/actions";
import ai from "@/lib/google";
import { generatePrompt } from "@/utils";
import { Medication, Message, Symptom, User } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import {
  BotIcon,
  LoaderIcon,
  SendIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
  isPro: boolean;
  user: User;
  symptoms: Symptom[];
  medications: Medication[];
  messages: Message[];
}

const ChatBox = ({ isPro, user, symptoms, medications, messages }: Props) => {
  console.log("isPro", isPro);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [msgs, setMsgs] = useState<Message[]>(messages || []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  const { mutate: createUserMessage } = useMutation({
    mutationKey: ["create-user-messages"],
    mutationFn: async (message: string) =>
      createMessages({ role: "user", message: message }),
  });

  const { mutate: createBotMessage } = useMutation({
    mutationKey: ["create-bot-messages"],
    mutationFn: async (message: string) =>
      createMessages({ role: "model", message: message }),
  });

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    scrollToBottom();

    if (isPro === false && messages.length >= 10) {
      setError("Message limit reached. Please upgrade to pro.");
      toast.error("Message limit reached. Please upgrade to pro.");
      return;
    }

    if (!input.trim()) return;

    const newMessages = [...msgs, { role: "user", content: input }];
    // @ts-ignore
    setMsgs(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const model = ai.getGenerativeModel({
        // model: "gemini-1.5-flash"
        model: "gemini-1.5-pro-exp-0801",
      });

      const promptText = generatePrompt({ symptoms, medications, user });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: promptText }],
          },
        ],
        ...newMessages.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0,
        },
        systemInstruction: {
          role: "model",
          parts: [
            {
              text: promptText,
            },
          ],
        },
      });

      const result = await chat.sendMessage(input);
      const response = result.response;
      const botMessageContent = response.text();

      const botMessage = { role: "model", content: botMessageContent };

      createUserMessage(input);
      createBotMessage(botMessage.content);

      // @ts-ignore
      setMsgs((prev) => [...prev, botMessage]);
    } catch (error) {
      setError("Error generating response");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (messages) {
      setMsgs(messages);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full relative sm:pl-4">
      <div className="flex flex-col md:border rounded-xl h-full w-full">
        <div className="w-full h-full overflow-y-scroll space-y-4 md:p-4 pb-12 flex flex-col flex-1 scrollbar-hide rounded-xl">
          {!isLoading && !error && msgs?.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center w-full py-8 h-full">
              <BotIcon className="w-10 h-10 text-primary" />
              <p className="text-sm text-muted-foreground font-medium mt-2">
                Start a conversation with your personal assistant
              </p>
            </div>
          )}
          {msgs?.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start space-x-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "user" ? (
                <>
                  <div className="flex items-end">
                    <p className="bg-primary text-white text-sm px-4 py-2 rounded-lg">
                      {message.content}
                    </p>
                  </div>
                  <UserIcon className="w-8 h-8 bg-blue-100 rounded-full p-1" />
                </>
              ) : (
                <>
                  <BotIcon className="w-8 h-8 text-white bg-primary rounded-full px-4 py-2" />
                  <div className="bg-gray-100 rounded-lg p-2 max-w-md">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose"
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col justify-center items-center text-center p-4">
              <LoaderIcon className="w-5 h-5 animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">
                Assistant is thinking...
              </p>
            </div>
          )}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center w-full py-8 h-full">
              <p className="text-sm text-red-500 bg-red-50 px-4 py-1.5 rounded-md mx-auto font-medium flex items-center">
                <TriangleAlertIcon className="w-4 h-4 mr-2" />
                {error}
              </p>
              {!isPro && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/dashboard/account/billing">Upgrade to Pro</Link>
                </Button>
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="w-full h-px" />
        </div>
        <div className="w-full rounded-xl fixed sm:sticky bottom-0 inset-x-0 px-2 bg-background">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center w-full      mx-auto rounded-full  px-4 py-2"
          >
            <div className="relative flex-grow ">
              <Input
                type="text"
                value={input}
                disabled={isLoading}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your health..."
                className="w-full rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="iconlg"
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-[0%]  p-2 bg-primary text-white rounded-full hover:bg-primary disabled:opacity-50"
              >
                {isLoading ? (
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <SendIcon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
