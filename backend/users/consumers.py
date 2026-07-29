import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Message, Group

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f'chat_{self.group_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_text = text_data_json.get('message')
        user_id = text_data_json.get('user_id') 
        username = text_data_json.get('username')

        if message_text and user_id:
            await self.save_message(user_id, self.group_id, message_text)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_text,
                'username': username
            }
        )

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        
        await self.send(text_data=json.dumps({
            'message': message,
            'username': username
        }))

    @database_sync_to_async
    def save_message(self, user_id, group_id, text):
        try:
            user = User.objects.get(id=user_id)
            group = Group.objects.get(id=group_id)
            return Message.objects.create(sender=user, group=group, text=text)
        except Exception as e:
            print("خطا در ذخیره پیام:", e)