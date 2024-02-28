/* eslint-disable react/prop-types */
import { Box, Button, FormControl, IconButton, Input, Spinner, Text, useToast } from "@chakra-ui/react"
import { ChatState } from "../Context/ChatProvider"
import { ArrowBackIcon } from '@chakra-ui/icons'
import { getSender, getSenderFull } from '../config/ChatLogics'
import ProfileModal from '../components/miscellaneous/ProfileModal'
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal"
import { useEffect, useState } from "react"
import Server_URL from "../Server_URL"
import axios from 'axios'
import ScrollableChat from "./ScrollableChat"
import io from 'socket.io-client'
import Lottie from 'react-lottie';
import animationData from '../animations/typing.json';

const ENDPOINT = Server_URL;
let socket, selectedChatCompare;

function SingleChat({ fetchAgain, setFetchAgain }) {

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
        },
    };

    const { user, selectedChat, setSelectedChat, notification, setNotification } = ChatState();
    // console.log("hi", notification);
    const toast = useToast();


    useEffect(() => {
        socket = io(ENDPOINT, { "transports": ["websocket"] });
        socket.emit("setup", user);
        socket.on('connected', () => setSocketConnected(true));
        socket.on('typing', () => setIsTyping(true));
        socket.on('stop typing', () => setIsTyping(false));
    }, [])


    const fetchMessages = async () => {
        if (!selectedChat) {
            return;
        }

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            setLoading(true);
            const { data } = await axios.get(`${Server_URL}/api/message/${selectedChat._id}`, config);
            setMessages(data);
            setLoading(false);

            socket.emit('join chat', selectedChat._id);
        } catch (error) {
            setLoading(false);
            toast({
                title: "Error Occured!",
                description: "Failed to fetch the messages",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
    }

    useEffect(() => {
        fetchMessages();

        selectedChatCompare = selectedChat;
    }, [selectedChat]);

    // console.log(notification, "---------");

    useEffect(() => {
        // setNotification([]);
        socket.on('message received', (newMessageReceived) => {
            if (!selectedChatCompare || selectedChatCompare._id !== newMessageReceived.chat._id) {
                // give notification
                if (!notification || !notification.includes(newMessageReceived)) {
                    setNotification([newMessageReceived, ...notification]);
                    setFetchAgain(!fetchAgain);
                }
            }
            else {
                setMessages([...messages, newMessageReceived]);
            }
        })

    })

    // console.log(notification, "---------");

    const sendMessage = async (event) => {
        if ((event.key === "Enter" || event.type == "click") && newMessage) {
            socket.emit('stop typing', selectedChat._id);
            try {
                const config = {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user.token}`,
                    },
                };

                setNewMessage("");
                const { data } = await axios.post(`${Server_URL}/api/message`,
                    {
                        content: newMessage,
                        chatId: selectedChat._id,
                    },
                    config
                );

                // console.log(data);

                socket.emit('new message', data);
                setMessages([...messages, data]);
            }
            catch (error) {
                toast({
                    title: "Error Occured!",
                    description: "Failed to send the message",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                    position: "bottom"
                })
            }
        }
    }

    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        // Typing Indicator Logic
        if (!socketConnected) {
            return;
        }

        if (!typing) {
            setTyping(true);
            socket.emit('typing', selectedChat._id);
        }

        let lastTypingTime = new Date().getTime();
        let timerLength = 3000;
        setTimeout(() => {
            let timeNow = new Date().getTime();
            let timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && typing) {
                socket.emit('stop typing', selectedChat._id);
                setTyping(false);
            }
        }, timerLength)
    }
    return (
        <>
            {selectedChat ? (
                <>
                    <Text
                        component={'div'}
                        fontSize={{ base: '28px', md: '30px' }}
                        pb={3}
                        px={2}
                        w='100%'
                        fontFamily='Work sans'
                        display='flex'
                        justifyContent={{ base: 'space-between' }}
                        alignItems='center'
                    >
                        <IconButton
                            display={{ base: 'flex', md: 'none' }}
                            icon={<ArrowBackIcon />}
                            onClick={() => setSelectedChat("")}
                        />
                        {!selectedChat.isGroupChat ? (
                            <>
                                {getSender(user, selectedChat.users)}
                                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
                            </>
                        ) : (
                            <>
                                {selectedChat.chatName.toUpperCase()}
                                <UpdateGroupChatModal fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} fetchMessages={fetchMessages} />
                            </>
                        )}
                    </Text>
                    <Box
                        display='flex'
                        flexDirection='column'
                        justifyContent='flex-end'
                        p={3}
                        bg='#E8E8E8'
                        w='100%'
                        h='100%'
                        borderRadius='lg'
                        overflowY='hidden'
                    >
                        {loading ? (
                            <Spinner
                                size='xl'
                                w={20}
                                h={20}
                                alignSelf='center'
                                margin='auto'
                            />) : (
                            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'scroll', scrollbarWidth: 'none' }}>
                                <ScrollableChat messages={messages} />
                            </div>
                        )}

                        {isTyping ? <div>
                            <Lottie
                                options={defaultOptions}
                                width={70}
                                style={{ marginBottom: 15, marginLeft: 0 }}
                            />
                        </div> : <></>}
                        <FormControl onKeyDown={sendMessage} isRequired mt={3} display='flex' flexDirection='row' gap={2}>
                            <Input
                                variant='filled'
                                bg='#E0E0E0'
                                placeholder="Enter a message..."
                                onChange={typingHandler}
                                value={newMessage}
                            />
                            <Button
                                background='#38B2AC'
                                color='white'
                                _hover={{ color: 'black', background: '#38B29C' }}
                                onClick={sendMessage}
                            >
                                Send
                            </Button>
                        </FormControl>
                    </Box>
                </>
            ) : (
                <Box display='flex' alignItems='center' justifyContent='center' h='100%'>
                    <Text fontSize='3xl' pb={3} fontFamily='Work sans'>
                        Click on a user to start chatting
                    </Text>
                </Box>
            )}
        </>
    )
}

export default SingleChat