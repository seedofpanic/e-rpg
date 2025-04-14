import os


_base_lore = """
# World Overview
- The Agnir Peninsula was once a hub of culture, magic, and trade. Now, it is broken—scarred by magical disasters, internal conflict, and the shadowy rise of a crime empire.
- The world balances themes of power, corruption, betrayal, and forbidden knowledge.
- Magic is distrusted after a major catastrophe and is now mostly outlawed or monopolized by criminals.

# Key Historical Event
- The destruction of Arktown, a mage city, during a failed divine ascension ritual involving Aktarine Crystals.
- This explosion created a Zone of Unstable Magic, filled with corrupted terrain, wild anomalies, and mutated lifeforms.
- The disaster allowed the Manticore Syndicate to destroy the last Mage Guild and seize control of major cities.

# Aktarine Crystals (Magical Element)
- Rare, glowing crystals born from the Arktown explosion.
- Highly dangerous: causes mutation, madness, and death on contact unless contained.

# Factions
## Manticore
- Secretive, powerful criminal syndicate that manipulates politics and controls trade, security, and even parts of the military.
- Betrayed their former allies, the draconids, to gain control of the peninsula.
- Interested in magical relics, especially those from Arktown.
- Known leaders are unknown; they operate through proxies and fear.
## Brave Lions
- Kadera's militia.

# Sigmar's Cult
- Founded by a mage who became a godlike being after being trapped in the magical rift.
- Drains life force from his followers to sustain his power.
- His cult spreads through visions, miracles, and madness.
- Seeks to expand influence by promising salvation from the magical chaos.

# Kingdom of Rok
- Distant empire, politically neutral but economically involved.
- Home to Benne, a surviving Arktown mage who uses Aktarine for invention and commerce.
- Interested in stabilizing magic—but only when profitable.

# Important Locations
## Arktown Ruins / Zone of Unstable Magic
- Ground zero of the magic disaster.
- Landscape shifts unnaturally, filled with magical storms, arcane beasts, and cursed artifacts.
- Entering this zone risks mutation, memory loss, or death—but great power awaits.

## Luran, Kadera, Portvel
- Cities now ruled by Manticore through puppet governors.
- The people live under false peace: crime is controlled, but freedom is gone.
- Mages, scholars, or rebels live in hiding or exile.

## Lortan
- Elven stronghold.
- Elven population heavily diminished because of a magical disease.
- Few elven survivors roam, paranoid and spiritually broken.

## Stifa
- A burned city, destroyed during the draconid invasion.
- Became a symbol of vengeance and false heroism after Manticore drove the draconids away.

# Major Characters
## Kroel – The Seeker
- Arktown mage who discovered the properties of Aktarine and tried to contact ancient gods.
- Instead contacted Illithids, who now show interest in the peninsula.

## Sigmar – The Broken God
- Once a divine mage, now a trapped, power-hungry being who manipulates mortals from his rift prison.
- Uses a cult to return to the world and feed on mortal souls.
- Wants to reshape reality with divine rule.

## Benne – The Merchant Mage
- Survived Arktown's fall and fled to Rok.
- Practical and greedy, sees magic as a tool and Aktarine as profit.
- Creates magical devices but has no moral code.
"""

base_lore_ru = """
# Обзор мира
- Агнирский полуостров был когда-то центром культуры, магии и торговли. Теперь он разбит — поврежден магическими катастрофами, внутренними конфликтами и возрождением криминальной империи.
- Мир построен на противоречиях власти, коррупции, предательства и запретной магии.
- Магия сейчас почти запрещена или контролируется преступными организациями.

# Основные исторические события
- Уничтожение Арктауна, города магов, во время неудачной церемонии вознесения в бога.
- Это взрыв создал Зону Нестабильной Магии, заполненную испорченной местностью, дикими аномалиями и мутировавшими живыми существами.
- Катастрофа позволила Мантикоре уничтожить последнюю Магическую Гильдию и захватить контроль над крупными городами.

# Кристаллы Актары (Магический элемент)
- Редкие, светящиеся кристаллы, рожденные из взрыва Арктауна.
- Очень опасны: вызывает мутацию, безумие и смерть при контакте, если не контролируются.

# Фракции
## Мантикора
- Секретная, мощная преступная организация, которая манипулирует политикой и контролирует торговлю, безопасность и даже часть военных.
- Предал своих бывших союзников, драконидов, чтобы получить контроль над полуостровом.
- Заинтересована в магических реликвиях, особенно от Арктауна.
- Лидеры неизвестны; они действуют через прокси и страх.
## Смелые Львы
- Миллиция Кадеры.

# Культ Сигмара
- Основан магом, который стал богоподобным существом после того, как был захвачен в магический провал.
- Обеспечивает своим последователям жизненную силу, чтобы поддерживать свою мощь.
- Его культ распространяется через видения, чудеса и безумие.
- Ищет расширить свое влияние, обещая спасение из магического хаоса.

# Королевство Рок
- Отдаленная империя, политически нейтральная, но экономически задействованная.
- Дом Бенне, выжившего мага Арктауна, который использует Актары для изобретения и торговли.
- Заинтересована в стабилизации магии — но только прибыльной.

# Важные места
## Арктаунские руины / Зона Нестабильной Магии
- Место нуля магической катастрофы.
- Перемены ландшафта происходят неестественно, заполнены магическими штормами, арканными животными и проклятыми артефактами.
- Вход в эту зону рискует мутацией, потерей памяти или смертью — но великие силы ждут.

## Луран, Кадера, Портвел
- Города теперь управляются Мантикоре через псеудо-губернаторов.
- Люди живут под ложным миром: преступления контролируются, но свобода исчезла.
- Маги, ученые или бунтари прячутся или в изгнании.

## Лортан
- Эльфийский форт.
- Эльфийская популяция сильно уменьшилась из-за магической болезни.
- Несколько эльфийских выживших бродит, парализованные и духовно сломанные.

## Стифа
- Горе-город, уничтоженный во время драконидской инвазии.
- Стал символом мести и ложного героизма после того, как Мантикора оттеснила драконидов.

# Основные персонажи
## Кроел – Искатель
- Арктаунский маг, который обнаружил свойства Актары и пытался контактировать с древними богами.
- Вместо этого он контактировал с Иллитидами, которые теперь проявляют интерес к полуострову.

## Сигмар – Поврежденный Бог
- Бывший божественный маг, теперь захваченный в магический провал, мощный и жадный существо, которое манипулирует смертными из своего заточения в провале.
- Использует культ, чтобы вернуться в мир и питаться душами смертных.
- Хочет переделать реальность в соответствии с божественными законами.

## Бенне – Торговый Маг
- Выжил после падения Арктауна и бежал в Рок.
- Практичный и жадный, видит магию как инструмент и Актары как прибыль.
- Создает магические устройства, но не имеет морального кодекса.
"""

language = os.getenv("LANGUAGE")

if language == "ru":
    _base_lore = base_lore_ru

def set_base_lore(lore: str):
    global _base_lore
    _base_lore = lore

def get_base_lore() -> str:
    return _base_lore
