const express = require('express');
const app = express();
const port = 3000;


app.use(express.json());

class MessageBuffer {
    constructor(){
        this.buffers = {};
        this.cleanupInterval = 300;
        this.silenceThreshold = 120;
        this.minWordsAfterSilence = 5;


        setInterval(() => {
            this.cleanupOldSessions();
        }, this.cleanupInterval*1000)
    }

    cleanupOldSessions(){
        const currentTime = Date.now() / 1000;

        const expiredSessions = Object.keys(this.buffers).filter((sessionId) =>{
            const data = this.buffers[sessionId];
            return currentTime - data.lastActivity > 3600;
        })

        for(const sessionId of expiredSessions){
            delete this.buffers[sessionId];
        }
    }

    getBuffer(sessionId){
        const currentTime = Date.now() / 1000;

        if(!this.buffers[sessionId]){
            this.buffers[sessionId]= {
                messages: [],
                lastAnalysisTime: currentTime,
                wordsAfterSilence: 0,
                silenceDetected: false
            };
        }else{
            const buffer = this.buffers[sessionId];
            const timeSinceActivity = currentTime- buffer.lastActivity;

            if(timeSinceActivity > this.silenceThreshold){
                buffer.silenceDetected = true;
                buffer.wordsAfterSilence = 0;
                buffer.messages = [];
            }
            
            buffer.lastActivity = currentTime;
        }
        return this.buffers[sessionId];
    }
}

const messageBuffer = new MessageBuffer();
const ANALYSIS_INTERVAL = 30;

async function createNotificationPrompt(messages){
    const formattedDiscussion = messages.map((msg) => {
 
    const speaker = msg.is_user ? '{{user_name}}' : 'other';
        return `${msg.text}: ${speaker}`; 
    })
    const discussonText = formattedDiscussion.join('\n');

    const systemPrompt = `
    You are a personal assistant of {{user_name}}, a person who is interested in learning new things.
    Answer his questions in a short way, you are even allowed to use single words.

    Some facts about {{user_name}}:
    {{user_facts}}  

    Current discussion:
    ${discussonText}
    `;

    return {
        notification:{
            prompt: systemPrompt,
            params: ["user_name", "user_facts"]
        }
    }
}

app.post("/webhook", (req,res) => {
    const data = req.body;
    const sessionId = data.sessionId;
    const segments = data.segments || [];

    if(!sessionId)return res.status(400).send("sessionId is required");

    const currentTime = Date.now() / 1000;
    const buffer = messageBuffer.getBuffer(sessionId);

    for(const segment of segments){
        const text = segment.text.trim();
        if(text){
            const timestamp = segment.start || currentTime;
            const isUser = segment.is_user || false;

            if(buffer.silenceDetected){
                const wordsInSegment = text.split(/\s+/).length;
                buffer.wordsAfterSilence += wordsInSegment;

                if(bufferData.wordsAfterSilence >= messageBuffer.minWordsAfterSilence){
                    buffer.silenceDetected = false;
                    bufferData.lastAnalysisTime = currentTime;
                }
            }
        }
    }

    const timeSinceLastAnalysis = currentTime - buffer.lastAnalysisTime;
    if(timeSinceLastAnalysis >= ANALYSIS_INTERVAL && bufferData.message.length > 0 && !bufferData.silenceDetected){
        const sortedMessages = bufferData.message.sort((a,b) => a.timestamp - b.timestamp);
        if(sortedMessages.some((msg) => /[jhy]arvis/.test(msg.text.toLowerCase()))) {
            const notification = createNotificationPrompt(sortedMessages);
            bufferData.lastAnalysisTime = currentTime;
            bufferData.messages = [];

            return res.status(200).json(notification);
        }else{
            return res.status(200).json({});
        }
    }
    return res.status(202).json({});
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
