# main.py
from discord.ui import Select, View
from typing import Union
import discord
from discord import app_commands
from discord.ext import commands
import asyncpg
import os
import bcrypt
from nanoid import generate
import random
import datetime
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# Configuration
TOKEN = os.getenv('DISCORD_TOKEN')
LOG_CHANNEL_ID = int(os.getenv('LOG_CHANNEL_ID'))
ADMIN_ID = 1389789449885581443 

# --- CONFIGURATION START ---

# 1. Map Raw IDs to Friendly Names here
SERVICE_DISPLAY_NAMES = {
    'main': 'mainaccess',
    'ksm': 'ksmaccess',
    'ytmp4': 'ytmp4',
    'eaglercraft': 'eaglercraft',
    'selenite': 'selenite',
    'materialious': 'invid',
    'adea': 'movietvshowarchive',
    'fgea': 'nexusai',
    'spea': 'rtlpdash',
    'anysite': 'techsuswebembedder'
}

# 2. Generate the Choices list for Discord automatically
# This restricts the slash command to ONLY these options
SERVICE_CHOICES = [
    app_commands.Choice(name=friendly, value=raw) 
    for raw, friendly in SERVICE_DISPLAY_NAMES.items()
]

# Service Plans Logic
PLAN_SERVICES = {
    'low': ['main', 'ksm', 'ytmp4'],
    'medium': ['main', 'ksm', 'ytmp4', 'eaglercraft', 'selenite', 'materialious', 'adea'],
    'high': ['main', 'ksm', 'ytmp4', 'eaglercraft', 'selenite', 'materialious', 'adea', 'fgea', 'spea', 'anysite']
}
# --- CONFIGURATION END ---

# Bot Setup
intents = discord.Intents.default()
intents.members = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Database Pools
pools = {
    "techsus": None,
    "bot": None,
    "rtlp": None
}

# --- Helper Functions ---

def generate_service_password():
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    return ''.join(random.choice(chars) for _ in range(8))

async def log_action(interaction: discord.Interaction, action: str, details: str):
    channel = bot.get_channel(LOG_CHANNEL_ID)
    if channel:
        embed = discord.Embed(title=f"Action Logged: {action}", color=discord.Color.blue(), timestamp=datetime.datetime.now())
        embed.add_field(name="Admin", value=f"{interaction.user.name} ({interaction.user.id})", inline=False)
        embed.add_field(name="Details", value=details, inline=False)
        await channel.send(embed=embed)

async def get_perm_level(user: discord.Member) -> int:
    if user.id == ADMIN_ID:
        return 3
    
    row = await pools['bot'].fetchrow("SELECT perm_level FROM permissions WHERE snowflake_id = $1 AND type = 'USER'", user.id)
    if row:
        return row['perm_level']

    highest_perm = 0
    role_ids = [role.id for role in user.roles]
    if role_ids:
        rows = await pools['bot'].fetch("SELECT perm_level FROM permissions WHERE snowflake_id = ANY($1::bigint[]) AND type = 'ROLE'", role_ids)
        for r in rows:
            if r['perm_level'] > highest_perm:
                highest_perm = r['perm_level']

    return highest_perm

async def get_techsus_id(discord_id: int):
    row = await pools['bot'].fetchrow("SELECT techsus_user_id FROM linked_accounts WHERE discord_id = $1", discord_id)
    return row['techsus_user_id'] if row else None

def check_perms(level_required):
    async def predicate(interaction: discord.Interaction):
        user_level = await get_perm_level(interaction.user)
        if user_level >= level_required:
            return True
        await interaction.response.send_message(f"⛔ Insufficient permissions. Required: {level_required}, You: {user_level}", ephemeral=True)
        return False
    return app_commands.check(predicate)

# --- Events ---

@bot.event
async def on_ready():
    pools['techsus'] = await asyncpg.create_pool(
        user=os.getenv('TECHSUS_DB_USER'), password=os.getenv('TECHSUS_DB_PASS'),
        database=os.getenv('TECHSUS_DB_NAME'), host=os.getenv('TECHSUS_DB_HOST'), port=os.getenv('TECHSUS_DB_PORT')
    )
    pools['bot'] = await asyncpg.create_pool(
        user=os.getenv('BOT_DB_USER'), password=os.getenv('BOT_DB_PASS'),
        database=os.getenv('BOT_DB_NAME'), host=os.getenv('BOT_DB_HOST'), port=os.getenv('BOT_DB_PORT')
    )
    pools['rtlp'] = await asyncpg.create_pool(
        user=os.getenv('RTLP_DB_USER'), password=os.getenv('RTLP_DB_PASS'),
        database=os.getenv('RTLP_DB_NAME'), host=os.getenv('RTLP_DB_HOST'), port=os.getenv('RTLP_DB_PORT')
    )
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')
    print('Databases Connected.')

@bot.command()
async def sync(ctx):
    if ctx.author.id == ADMIN_ID:
        bot.tree.copy_global_to(guild=ctx.guild)
        await bot.tree.sync(guild=ctx.guild)
        await ctx.send("✅ Slash commands synced to this server!")
    else:
        await ctx.send("❌ You are not the Bot Admin.")

@bot.command()
async def clearglobal(ctx):
    if ctx.author.id == ADMIN_ID:
        bot.tree.clear_commands(guild=None)
        await bot.tree.sync()
        await ctx.send("✅ Global commands have been nuked!")
    else:
        await ctx.send("No perms.")

@bot.event
async def on_member_remove(member):
    ts_id = await get_techsus_id(member.id)
    if ts_id:
        channel = bot.get_channel(LOG_CHANNEL_ID)
        if channel:
            roles = [r.name for r in member.roles if r.name != "@everyone"]
            embed = discord.Embed(title="⚠️ Linked User Left Server", color=discord.Color.red())
            embed.add_field(name="Discord User", value=f"{member.name} ({member.id})", inline=False)
            embed.add_field(name="TechSus ID", value=ts_id, inline=False)
            embed.add_field(name="Roles Lost", value=", ".join(roles) if roles else "None", inline=False)
            await channel.send(embed=embed)

# --- Commands ---

@bot.tree.command(name="config", description="Set permission level for User or Role")
@check_perms(3)
async def config(interaction: discord.Interaction, target: Union[discord.Member, discord.Role], level: int):
    if level < 0 or level > 3:
        await interaction.response.send_message("Level must be 0-3", ephemeral=True)
        return
    s_type = 'ROLE' if isinstance(target, discord.Role) else 'USER'
    await pools['bot'].execute("""
        INSERT INTO permissions (snowflake_id, perm_level, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (snowflake_id) DO UPDATE SET perm_level = $2
    """, target.id, level, s_type)
    await interaction.response.send_message(f"✅ Set {target.mention} to Level {level}")
    await log_action(interaction, "Config Change", f"Set {s_type} {target.id} to Level {level}")

@bot.tree.command(name="link", description="Link a TechSus User to a Discord User")
@check_perms(1)
async def link(interaction: discord.Interaction, techsus_username: str, discord_user: discord.User):
    ts_user = await pools['techsus'].fetchrow("SELECT id FROM users WHERE username = $1", techsus_username)
    if not ts_user:
        await interaction.response.send_message(f"❌ TechSus user '{techsus_username}' not found.", ephemeral=True)
        return
    await pools['bot'].execute("""
        INSERT INTO linked_accounts (discord_id, techsus_user_id)
        VALUES ($1, $2)
        ON CONFLICT (discord_id) DO UPDATE SET techsus_user_id = $2
    """, discord_user.id, ts_user['id'])
    await interaction.response.send_message(f"🔗 Linked {discord_user.mention} to TechSus User: {techsus_username}")
    await log_action(interaction, "Account Linked", f"Discord: {discord_user.id} -> TechSus: {techsus_username} ({ts_user['id']})")

@bot.tree.command(name="unlink", description="Unlink a Discord User from a TechSus ID")
@check_perms(1)
async def unlink(interaction: discord.Interaction, target: discord.User):
    existing_link = await get_techsus_id(target.id)
    if not existing_link:
        await interaction.response.send_message(f"❌ {target.mention} is not currently linked.", ephemeral=True)
        return
    await pools['bot'].execute("DELETE FROM linked_accounts WHERE discord_id = $1", target.id)
    await interaction.response.send_message(f"🔗⛔ Unlinked {target.mention}")
    await log_action(interaction, "Account Unlinked", f"Removed link for Discord: {target.id}")

@bot.tree.command(name="user_create", description="Create a new TechSus User")
@check_perms(1)
async def user_create(interaction: discord.Interaction, discord_user: discord.User, techsus_username: str, password: str):
    exists = await pools['techsus'].fetchval("SELECT 1 FROM users WHERE username = $1", techsus_username)
    if exists:
        await interaction.response.send_message("❌ Username already taken.", ephemeral=True)
        return
    new_id = generate(size=21)
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    await pools['techsus'].execute("""
        INSERT INTO users (id, username, password, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
    """, new_id, techsus_username, hashed_pw)
    await pools['bot'].execute("""
        INSERT INTO linked_accounts (discord_id, techsus_user_id) VALUES ($1, $2)
        ON CONFLICT (discord_id) DO UPDATE SET techsus_user_id = $2
    """, discord_user.id, new_id)
    
    svc_pass = generate_service_password()
    await pools['techsus'].execute("""
        INSERT INTO service_access (id, user_id, service_name, password, access_type, status)
        VALUES ($1, $2, 'main', $3, 'full', 'active')
    """, generate(size=21), new_id, svc_pass)

    await interaction.response.send_message(f"✅ Created User: {techsus_username} and linked to {discord_user.mention}")
    await log_action(interaction, "User Create", f"Created {techsus_username} ({new_id})")

@bot.tree.command(name="subscription_add", description="Add subscription plan")
@check_perms(1)
async def sub_add(interaction: discord.Interaction, target: discord.User, plan: str):
    plan = plan.lower()
    if plan not in PLAN_SERVICES:
        await interaction.response.send_message("❌ Invalid plan. Use: low, medium, high", ephemeral=True)
        return

    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Discord user not linked.", ephemeral=True)
        return

    sub_id = generate(size=21)
    await pools['techsus'].execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'", ts_id)
    await pools['techsus'].execute("""
        INSERT INTO subscriptions (id, user_id, plan, status)
        VALUES ($1, $2, $3, 'active')
    """, sub_id, ts_id, plan)

    services_to_add = PLAN_SERVICES[plan]
    for svc in services_to_add:
        exists = await pools['techsus'].fetchval("SELECT 1 FROM service_access WHERE user_id=$1 AND service_name=$2 AND status='active'", ts_id, svc)
        if not exists:
            svc_pass = generate_service_password()
            await pools['techsus'].execute("""
                INSERT INTO service_access (id, user_id, service_name, password, access_type, status)
                VALUES ($1, $2, $3, $4, 'subscription', 'active')
            """, generate(size=21), ts_id, svc, svc_pass)

    await interaction.response.send_message(f"✅ Added {plan} subscription to {target.mention}")
    await log_action(interaction, "Subscription Add", f"User: {ts_id}, Plan: {plan}")

@bot.tree.command(name="service_view", description="View services and passwords")
@check_perms(1)
async def service_view(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return

    rows = await pools['techsus'].fetch("SELECT service_name, password FROM service_access WHERE user_id = $1 AND status = 'active'", ts_id)

    if not rows:
        await interaction.response.send_message("No active services.", ephemeral=True)
        return

    desc_list = []
    for r in rows:
        friendly = SERVICE_DISPLAY_NAMES.get(r['service_name'], r['service_name'])
        desc_list.append(f"**{friendly}**: `{r['password']}`")

    desc = "\n".join(desc_list)
    embed = discord.Embed(title="Active Services", description=desc, color=discord.Color.green())
    await interaction.response.send_message(embed=embed, ephemeral=True)
    await log_action(interaction, "Service View", f"Viewed services for {ts_id}")

@bot.tree.command(name="service_search", description="Find user by service password")
@check_perms(1)
async def service_search(interaction: discord.Interaction, password: str):
    row = await pools['techsus'].fetchrow("""
        SELECT u.username, u.id, sa.service_name
        FROM service_access sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.password = $1
    """, password)

    if row:
        friendly = SERVICE_DISPLAY_NAMES.get(row['service_name'], row['service_name'])
        await interaction.response.send_message(f"🔍 Found: User **{row['username']}** ({row['id']}) owns service **{friendly}**")
    else:
        await interaction.response.send_message("❌ No user found with that service password.")

    await log_action(interaction, "Service Search", f"Searched for pass: {password}")

@bot.tree.command(name="transaction_add", description="Manually log a transaction")
@check_perms(2)
async def trans_add(interaction: discord.Interaction, target: discord.User, purchase_info: str, payment_method: str):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return
    await pools['bot'].execute("""
        INSERT INTO transactions (techsus_user_id, description, payment_method)
        VALUES ($1, $2, $3)
    """, ts_id, purchase_info, payment_method)
    await interaction.response.send_message(f"💰 Transaction logged for {target.mention}")
    await log_action(interaction, "Transaction Add", f"User: {ts_id}, Info: {purchase_info}")

@bot.tree.command(name="user_info", description="View all details about a user")
@check_perms(1)
async def user_info(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return

    user_row = await pools['techsus'].fetchrow("SELECT username, id FROM users WHERE id = $1", ts_id)
    sub_row = await pools['techsus'].fetchrow("SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'", ts_id)
    svc_rows = await pools['techsus'].fetch("SELECT service_name FROM service_access WHERE user_id = $1 AND status = 'active'", ts_id)
    trans_rows = await pools['bot'].fetch("SELECT description, created_at FROM transactions WHERE techsus_user_id = $1 ORDER BY created_at DESC LIMIT 5", ts_id)

    embed = discord.Embed(title=f"User Info: {user_row['username']}", color=discord.Color.purple())
    embed.add_field(name="TechSus ID", value=user_row['id'], inline=False)
    embed.add_field(name="Discord ID", value=target.id, inline=True)
    embed.add_field(name="Subscription", value=sub_row['plan'] if sub_row else "None", inline=True)

    if svc_rows:
        service_names = [SERVICE_DISPLAY_NAMES.get(r['service_name'], r['service_name']) for r in svc_rows]
        services_str = ", ".join(service_names)
    else:
        services_str = "None"
        
    embed.add_field(name="Services", value=services_str, inline=False)

    trans_hist = "\n".join([f"• {t['created_at'].strftime('%Y-%m-%d')}: {t['description']}" for t in trans_rows]) if trans_rows else "No History"
    embed.add_field(name="Recent Transactions", value=trans_hist, inline=False)

    await interaction.response.send_message(embed=embed)
    await log_action(interaction, "User Info", f"Viewed info for {ts_id}")

@bot.tree.command(name="user_delete", description="Delete a User and all their data")
@check_perms(2)
async def user_delete(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ User not linked or does not exist.", ephemeral=True)
        return
    await pools['bot'].execute("DELETE FROM linked_accounts WHERE techsus_user_id = $1", ts_id)
    await pools['bot'].execute("DELETE FROM transactions WHERE techsus_user_id = $1", ts_id)
    await pools['techsus'].execute("DELETE FROM service_access WHERE user_id = $1", ts_id)
    await pools['techsus'].execute("DELETE FROM subscriptions WHERE user_id = $1", ts_id)
    await pools['techsus'].execute("DELETE FROM users WHERE id = $1", ts_id)
    await interaction.response.send_message(f"🗑️ completely wiped user data for {target.mention}")
    await log_action(interaction, "User Delete", f"Deleted User ID: {ts_id}")

# 10. Service Add (DROPDOWN)
@bot.tree.command(name="service_add", description="Manually grant a specific service")
@app_commands.choices(service_name=SERVICE_CHOICES)
@check_perms(1)
async def service_add(interaction: discord.Interaction, target: discord.User, service_name: str):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return

    exists = await pools['techsus'].fetchval("SELECT 1 FROM service_access WHERE user_id=$1 AND service_name=$2", ts_id, service_name)
    if exists:
        friendly = SERVICE_DISPLAY_NAMES.get(service_name, service_name)
        await interaction.response.send_message(f"⚠️ User already has service: {friendly}", ephemeral=True)
        return

    svc_pass = generate_service_password()
    await pools['techsus'].execute("""
        INSERT INTO service_access (id, user_id, service_name, password, access_type, status)
        VALUES ($1, $2, $3, $4, 'manual', 'active')
    """, generate(size=21), ts_id, service_name, svc_pass)

    friendly = SERVICE_DISPLAY_NAMES.get(service_name, service_name)
    await interaction.response.send_message(f"✅ Manually added service **{friendly}** to {target.mention}")
    await log_action(interaction, "Service Add", f"Added {service_name} to {ts_id}")

# 11. Service Remove (DROPDOWN)
@bot.tree.command(name="service_remove", description="Revoke a specific service")
@app_commands.choices(service_name=SERVICE_CHOICES)
@check_perms(1)
async def service_remove(interaction: discord.Interaction, target: discord.User, service_name: str):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return

    result = await pools['techsus'].execute("DELETE FROM service_access WHERE user_id = $1 AND service_name = $2", ts_id, service_name)

    friendly = SERVICE_DISPLAY_NAMES.get(service_name, service_name)
    if "0" in result:
        await interaction.response.send_message(f"❌ User does not have service: {friendly}", ephemeral=True)
    else:
        await interaction.response.send_message(f"🗑️ Removed service **{friendly}** from {target.mention}")
        await log_action(interaction, "Service Remove", f"Removed {service_name} from {ts_id}")

@bot.tree.command(name="subscription_remove", description="Cancel subscription and remove associated services")
@check_perms(1)
async def sub_remove(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return
    await pools['techsus'].execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1", ts_id)
    await pools['techsus'].execute("DELETE FROM service_access WHERE user_id = $1 AND access_type = 'subscription'", ts_id)
    await interaction.response.send_message(f"📉 Cancelled subscription for {target.mention}")
    await log_action(interaction, "Subscription Remove", f"Cancelled sub for {ts_id}")

@bot.tree.command(name="transaction_view", description="View full transaction history")
@check_perms(1)
async def trans_view(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return
    rows = await pools['bot'].fetch("SELECT id, description, payment_method, created_at FROM transactions WHERE techsus_user_id = $1 ORDER BY created_at DESC", ts_id)
    if not rows:
        await interaction.response.send_message("No transaction history.", ephemeral=True)
        return
    desc = "\n".join([f"**ID {r['id']}** | {r['created_at'].strftime('%Y-%m-%d')} | {r['description']} ({r['payment_method']})" for r in rows])
    embed = discord.Embed(title="Transaction History", description=desc, color=discord.Color.gold())
    await interaction.response.send_message(embed=embed)

class TransactionSelect(Select):
    def __init__(self, transactions):
        options = [
            discord.SelectOption(label=f"ID {t['id']}: {t['description'][:50]}", value=str(t['id']), description=t['payment_method'])
            for t in transactions[:25]
        ]
        super().__init__(placeholder="Select a transaction to delete...", min_values=1, max_values=1, options=options)
    async def callback(self, interaction: discord.Interaction):
        trans_id = int(self.values[0])
        await pools['bot'].execute("DELETE FROM transactions WHERE id = $1", trans_id)
        await interaction.response.send_message(f"🗑️ Transaction ID {trans_id} deleted.")
        await log_action(interaction, "Transaction Remove", f"Deleted Transaction ID {trans_id}")
        self.view.stop()

class TransactionDeleteView(View):
    def __init__(self, transactions):
        super().__init__()
        self.add_item(TransactionSelect(transactions))

@bot.tree.command(name="transaction_remove", description="Select a transaction to remove")
@check_perms(1)
async def trans_remove(interaction: discord.Interaction, target: discord.User):
    ts_id = await get_techsus_id(target.id)
    if not ts_id:
        await interaction.response.send_message("❌ Not linked.", ephemeral=True)
        return
    rows = await pools['bot'].fetch("SELECT id, description, payment_method FROM transactions WHERE techsus_user_id = $1 ORDER BY created_at DESC", ts_id)
    if not rows:
        await interaction.response.send_message("No transactions to delete.", ephemeral=True)
        return
    view = TransactionDeleteView(rows)
    await interaction.response.send_message("Select the transaction to delete:", view=view, ephemeral=True)

@bot.tree.command(name="rtlp_list", description="List RTLP Members")
@check_perms(1)
async def rtlp_list(interaction: discord.Interaction):
    rows = await pools['rtlp'].fetch("SELECT full_name, employee_key FROM employees ORDER BY id ASC")
    if not rows:
        await interaction.response.send_message("No RTLP Members found.")
        return
    desc = "\n".join([f"👤 **{r['full_name']}** - Key: `{r['employee_key']}`" for r in rows])
    embed = discord.Embed(title="RTLP Members", description=desc, color=discord.Color.orange())
    await interaction.response.send_message(embed=embed, ephemeral=True)
    await log_action(interaction, "RTLP List", "Viewed RTLP Member list")

@bot.tree.command(name="rtlp_add", description="Add RTLP Member")
@check_perms(1)
async def rtlp_add(interaction: discord.Interaction, name: str, key: str):
    await pools['rtlp'].execute("INSERT INTO employees (full_name, employee_key) VALUES ($1, $2)", name, key)
    await interaction.response.send_message(f"✅ Added RTLP Member {name}")
    await log_action(interaction, "RTLP Add", f"Added {name}")

@bot.tree.command(name="rtlp_del", description="Delete RTLP Member by Key")
@check_perms(1)
async def rtlp_del(interaction: discord.Interaction, key: str):
    result = await pools['rtlp'].execute("DELETE FROM employees WHERE employee_key = $1", key)
    if "0" in result:
        await interaction.response.send_message("❌ No RTLP Member found with that key.")
    else:
        await interaction.response.send_message("🗑️ RTLP Member deleted.")
        await log_action(interaction, "RTLP Delete", f"Deleted RTLP Member with key {key}")

bot.run(TOKEN)