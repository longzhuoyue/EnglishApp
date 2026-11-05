import * as OpenCC from "opencc-js/core";
import * as Locale from "opencc-js/preset";

const SITE = "https://longzhuoyue.github.io";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const TEACH_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
const SPEECH_MODEL = "@cf/openai/whisper";
const simplify = OpenCC.ConverterFactory(Locale.from.tw, Locale.to.cn);
const WORD_SETS = [
  ["见面问候", [["hello", "你好", "Hello, I'm Mia.", "你好，我是米娅。"], ["morning", "早晨", "Good morning, Ben.", "早上好，本。"], ["name", "名字", "What is your name?", "你叫什么名字？"], ["meet", "见面", "Nice to meet you.", "很高兴认识你。"], ["friend", "朋友", "Tom is my friend.", "汤姆是我的朋友。"]]],
  ["礼貌表达", [["please", "请", "Water, please.", "请给我水。"], ["thanks", "谢谢", "Thanks for your help.", "谢谢你的帮助。"], ["sorry", "抱歉", "I'm sorry I'm late.", "抱歉，我迟到了。"], ["welcome", "欢迎", "Welcome to our home.", "欢迎来我们家。"], ["help", "帮助", "Can you help me?", "你能帮我吗？"]]],
  ["家人", [["mother", "妈妈", "My mother is at home.", "我妈妈在家。"], ["father", "爸爸", "My father likes tea.", "我爸爸喜欢喝茶。"], ["sister", "姐妹", "My sister is a student.", "我姐姐是一名学生。"], ["brother", "兄弟", "My brother can swim.", "我弟弟会游泳。"], ["family", "家人", "My family eats together.", "我的家人一起吃饭。"]]],
  ["一天的时间", [["today", "今天", "Today is Monday.", "今天是星期一。"], ["tomorrow", "明天", "See you tomorrow.", "明天见。"], ["yesterday", "昨天", "I was busy yesterday.", "我昨天很忙。"], ["early", "早", "I get up early.", "我起得很早。"], ["late", "晚", "The bus is late.", "公交车晚点了。"]]],
  ["天气", [["sunny", "晴朗的", "It is sunny today.", "今天天气晴朗。"], ["rain", "下雨", "It may rain later.", "一会儿可能会下雨。"], ["cold", "冷的", "It is cold outside.", "外面很冷。"], ["warm", "暖和的", "The room is warm.", "房间很暖和。"], ["windy", "有风的", "It is windy today.", "今天有风。"]]],
  ["吃早餐", [["breakfast", "早餐", "I eat breakfast at eight.", "我八点吃早餐。"], ["bread", "面包", "I have bread for breakfast.", "我早餐吃面包。"], ["egg", "鸡蛋", "She eats an egg.", "她吃一个鸡蛋。"], ["milk", "牛奶", "Would you like some milk?", "你想喝点牛奶吗？"], ["fruit", "水果", "I like fresh fruit.", "我喜欢新鲜水果。"]]],
  ["咖啡店", [["coffee", "咖啡", "I'd like a coffee, please.", "请给我一杯咖啡。"], ["tea", "茶", "Do you have hot tea?", "你们有热茶吗？"], ["cup", "杯子", "This cup is clean.", "这个杯子很干净。"], ["menu", "菜单", "Can I see the menu?", "我可以看一下菜单吗？"], ["order", "点餐", "Are you ready to order?", "你准备好点餐了吗？"]]],
  ["在餐厅", [["lunch", "午餐", "Let's have lunch together.", "我们一起吃午饭吧。"], ["dinner", "晚餐", "Dinner is ready.", "晚餐准备好了。"], ["rice", "米饭", "I would like some rice.", "我想要一些米饭。"], ["water", "水", "May I have some water?", "可以给我一些水吗？"], ["delicious", "美味的", "This soup is delicious.", "这汤很好喝。"]]],
  ["购物", [["shop", "商店", "The shop is open.", "这家商店开门了。"], ["price", "价格", "What is the price?", "价格是多少？"], ["size", "尺码", "Do you have my size?", "你们有我的尺码吗？"], ["buy", "买", "I want to buy this.", "我想买这个。"], ["pay", "付款", "Can I pay here?", "我可以在这里付款吗？"]]],
  ["问路", [["street", "街道", "This street is quiet.", "这条街很安静。"], ["left", "左边", "Turn left at the corner.", "在拐角处左转。"], ["right", "右边", "The bank is on the right.", "银行在右边。"], ["near", "附近", "Is there a park near here?", "这附近有公园吗？"], ["far", "远", "Is the station far away?", "车站远吗？"]]],
  ["乘车", [["bus", "公交车", "I take the bus to work.", "我乘公交车上班。"], ["train", "火车", "The train leaves at nine.", "火车九点出发。"], ["station", "车站", "Where is the station?", "车站在哪里？"], ["ticket", "车票", "I need one ticket.", "我需要一张车票。"], ["stop", "车站", "This is my stop.", "我在这一站下车。"]]],
  ["在家里", [["home", "家", "I am at home.", "我在家。"], ["room", "房间", "My room is small.", "我的房间很小。"], ["door", "门", "Please close the door.", "请关门。"], ["table", "桌子", "The book is on the table.", "书在桌子上。"], ["chair", "椅子", "Please sit on this chair.", "请坐这把椅子。"]]],
  ["身体与健康", [["tired", "累的", "I am tired today.", "我今天累了。"], ["sick", "生病的", "She is sick today.", "她今天生病了。"], ["doctor", "医生", "I need to see a doctor.", "我需要看医生。"], ["rest", "休息", "Please get some rest.", "请休息一下。"], ["better", "好一些", "I feel better now.", "我现在感觉好些了。"]]],
  ["工作学习", [["work", "工作", "I work in a shop.", "我在商店工作。"], ["school", "学校", "My school is nearby.", "我的学校在附近。"], ["study", "学习", "I study English every day.", "我每天学习英语。"], ["question", "问题", "I have a question.", "我有一个问题。"], ["answer", "回答", "Do you know the answer?", "你知道答案吗？"]]],
  ["喜欢的事", [["music", "音乐", "I like this music.", "我喜欢这段音乐。"], ["movie", "电影", "Let's watch a movie.", "我们看电影吧。"], ["book", "书", "I read a book at night.", "我晚上读书。"], ["walk", "散步", "We walk in the park.", "我们在公园散步。"], ["game", "游戏", "This game is fun.", "这个游戏很有趣。"]]],
  ["感受", [["happy", "开心的", "I am happy to see you.", "见到你我很开心。"], ["sad", "难过的", "Why are you sad?", "你为什么难过？"], ["hungry", "饿的", "I am hungry now.", "我现在饿了。"], ["thirsty", "渴的", "Are you thirsty?", "你渴了吗？"], ["busy", "忙的", "She is busy this morning.", "她今天早上很忙。"]]],
  ["常用动作", [["go", "去", "I go to work at eight.", "我八点去上班。"], ["come", "来", "Please come here.", "请到这里来。"], ["see", "看见", "I can see the bus.", "我能看到公交车。"], ["listen", "听", "Please listen to me.", "请听我说。"], ["speak", "说话", "Can you speak slowly?", "你能说慢一点吗？"]]],
  ["数字与数量", [["one", "一", "I have one ticket.", "我有一张车票。"], ["two", "二", "We need two cups.", "我们需要两个杯子。"], ["many", "许多", "There are many people here.", "这里有很多人。"], ["some", "一些", "I want some water.", "我想要一些水。"], ["more", "更多", "Can I have more tea?", "我可以再喝点茶吗？"]]],
  ["颜色", [["red", "红色的", "I like the red bag.", "我喜欢那个红色的包。"], ["blue", "蓝色的", "The sky is blue.", "天空是蓝色的。"], ["green", "绿色的", "The park is green.", "公园里一片绿色。"], ["black", "黑色的", "He has a black hat.", "他有一顶黑帽子。"], ["white", "白色的", "This shirt is white.", "这件衬衫是白色的。"]]],
  ["日常问题", [["what", "什么", "What is this?", "这是什么？"], ["where", "在哪里", "Where is the bank?", "银行在哪里？"], ["when", "什么时候", "When do we meet?", "我们什么时候见面？"], ["who", "谁", "Who is that person?", "那个人是谁？"], ["why", "为什么", "Why are you late?", "你为什么迟到？"]]]
];
const GRAMMAR_TOPICS = [
  ["am / is / are", "I 后用 am；he、she、it 后用 is；you、we、they 后用 are。"],
  ["一般现在时肯定句", "说经常做的事，用动词原形；主语是 he、she、it 时，动词通常加 s 或 es。"],
  ["一般现在时否定句", "I、you、we、they 后用 don't 加动词原形；he、she、it 后用 doesn't 加动词原形。"],
  ["一般现在时疑问句", "一般疑问句常以 Do 或 Does 开头，后面的主要动词用原形。"],
  ["have / has", "I、you、we、they 后用 have；he、she、it 后用 has，表示拥有。"],
  ["can / can't", "can 表示会或能够，can't 表示不会或不能；后面都接动词原形。"],
  ["a / an", "单数可数名词前常用 a 或 an；元音音素开头的词前通常用 an。"],
  ["名词复数", "表示两个或更多，名词通常加 s；有些词要加 es 或改变拼写。"],
  ["there is / there are", "介绍某处有什么：一个或不可数用 there is；多个用 there are。"],
  ["现在进行时", "说正在发生的事，使用 am、is 或 are 加动词的 ing 形式。"],
  ["一般过去时", "说过去发生的事，规则动词通常加 ed；否定句和疑问句常用 did 加动词原形。"],
  ["常见不规则过去式", "一些动词的过去式不加 ed，要单独记忆，例如 go → went、see → saw。"]
];
const GRAMMAR_PRACTICE = [
  { examples: [["I am tired.", "我累了。"], ["She is busy.", "她很忙。"]], questions: [["I ___ ready.", ["am", "is", "are"], 0], ["She ___ a teacher.", ["are", "is", "am"], 1], ["They ___ at home.", ["is", "are", "am"], 1]] },
  { examples: [["I drink tea every day.", "我每天喝茶。"], ["He goes to work by bus.", "他坐公交车上班。"]], questions: [["I ___ coffee every morning.", ["drink", "drinks", "drinking"], 0], ["He ___ to work by bus.", ["go", "goes", "going"], 1], ["They ___ English at school.", ["studies", "study", "studying"], 1]] },
  { examples: [["I don't eat fish.", "我不吃鱼。"], ["She doesn't like tea.", "她不喜欢茶。"]], questions: [["I ___ like coffee.", ["doesn't", "don't", "am not"], 1], ["He ___ work on Sunday.", ["don't", "doesn't", "isn't"], 1], ["They don't ___ meat.", ["eats", "eat", "eating"], 1]] },
  { examples: [["Do you speak English?", "你会说英语吗？"], ["Does she live here?", "她住在这里吗？"]], questions: [["___ you like tea?", ["Do", "Does", "Are"], 0], ["___ he play tennis?", ["Do", "Does", "Is"], 1], ["Does she ___ here?", ["lives", "live", "living"], 1]] },
  { examples: [["I have a bike.", "我有一辆自行车。"], ["He has a dog.", "他有一只狗。"]], questions: [["I ___ a question.", ["have", "has", "having"], 0], ["She ___ a new bag.", ["have", "has", "having"], 1], ["They ___ two cats.", ["has", "have", "having"], 1]] },
  { examples: [["I can swim.", "我会游泳。"], ["She can't drive.", "她不会开车。"]], questions: [["I can ___ English.", ["speak", "speaks", "speaking"], 0], ["He can't ___ today.", ["comes", "come", "coming"], 1], ["They ___ play the piano.", ["can", "cans", "are can"], 0]] },
  { examples: [["I have an apple.", "我有一个苹果。"], ["She has a book.", "她有一本书。"]], questions: [["I want ___ orange.", ["a", "an", "the an"], 1], ["He has ___ banana.", ["an", "a", "the an"], 1], ["She eats ___ egg.", ["a", "an", "a an"], 1]] },
  { examples: [["I have two books.", "我有两本书。"], ["There are three buses.", "有三辆公交车。"]], questions: [["two ___", ["book", "books", "bookes"], 1], ["three ___", ["bus", "buss", "buses"], 2], ["four ___", ["babys", "babies", "baby"], 1]] },
  { examples: [["There is a bank nearby.", "附近有一家银行。"], ["There are two shops here.", "这里有两家商店。"]], questions: [["___ a park nearby.", ["There is", "There are", "There have"], 0], ["___ two chairs in the room.", ["There is", "There are", "There be"], 1], ["___ some water in the bottle.", ["There is", "There are", "There have"], 0]] },
  { examples: [["I am eating lunch.", "我正在吃午饭。"], ["They are playing outside.", "他们正在外面玩。"]], questions: [["She is ___ a book now.", ["read", "reading", "reads"], 1], ["We are ___ dinner.", ["cook", "cooking", "cooks"], 1], ["I ___ listening to music.", ["am", "is", "are"], 0]] },
  { examples: [["I watched a movie yesterday.", "我昨天看了一部电影。"], ["Did you watch the game?", "你看那场比赛了吗？"]], questions: [["I ___ TV last night.", ["watch", "watched", "watching"], 1], ["Did she ___ yesterday?", ["worked", "work", "working"], 1], ["He didn't ___ the door.", ["opened", "open", "opening"], 1]] },
  { examples: [["I went home early.", "我很早就回家了。"], ["She saw her friend yesterday.", "她昨天见到了朋友。"]], questions: [["Yesterday I ___ to school.", ["go", "went", "goed"], 1], ["He ___ a movie last night.", ["see", "saw", "seed"], 1], ["We ___ lunch at noon.", ["eat", "eated", "ate"], 2]] }
];
const TRANSLATION_SETS = [
  ["打招呼", [["早上好。", "Good morning.", "使用 morning。"], ["你今天怎么样？", "How are you today?", "以 How 开头提问。"], ["很高兴认识你。", "Nice to meet you.", "使用 Nice to...。"]]],
  ["自我介绍", [["我叫林。", "My name is Lin.", "使用 My name is...。"], ["我住在北京。", "I live in Beijing.", "使用 live in。"], ["我正在学英语。", "I am learning English.", "使用 am 加动词 ing。"]]],
  ["咖啡店", [["我想要一杯咖啡。", "I'd like a coffee, please.", "礼貌地说 I'd like...。"], ["请给我一杯水。", "A glass of water, please.", "注意 a glass of。"], ["这杯茶多少钱？", "How much is this tea?", "使用 How much...？"]]],
  ["餐厅", [["我想看一下菜单。", "I'd like to see the menu.", "使用 the menu。"], ["我不要辣的。", "I don't want it spicy.", "使用 don't want。"], ["这个很好吃。", "This is delicious.", "delicious 表示美味的。"]]],
  ["问路", [["图书馆在哪里？", "Where is the library?", "以 Where is 开头。"], ["请在这里左转。", "Please turn left here.", "turn left 表示左转。"], ["车站离这里远吗？", "Is the station far from here?", "far from 表示离……远。"]]],
  ["购物", [["这个有大号吗？", "Do you have this in large?", "in large 表示大号。"], ["我可以试穿吗？", "Can I try it on?", "try it on 表示试穿。"], ["我买这个。", "I'll take this one.", "I'll take... 是常用购物表达。"]]],
  ["时间安排", [["我们三点见。", "Let's meet at three.", "at 用在具体时间前。"], ["我周六有空。", "I'm free on Saturday.", "on 用在星期前。"], ["我们可以改到明天吗？", "Can we change it to tomorrow?", "使用 Can we...？"]]],
  ["天气", [["今天天气怎么样？", "What's the weather like today?", "询问天气用 What's the weather like...？"], ["今天有点冷。", "It's a little cold today.", "a little 表示有点。"], ["明天可能会下雨。", "It might rain tomorrow.", "might 表示可能。"]]],
  ["交通", [["下一班公交车什么时候来？", "When does the next bus arrive?", "the next bus 表示下一班公交车。"], ["我要去机场。", "I need to go to the airport.", "使用 need to go to。"], ["这趟车到市中心吗？", "Does this bus go to the city center?", "使用 Does...go to...？"]]],
  ["酒店", [["我想办理入住。", "I'd like to check in.", "check in 表示办理入住。"], ["早餐几点开始？", "What time does breakfast start?", "使用 What time does...？"], ["我的房间在哪里？", "Where is my room?", "以 Where is 开头。"]]],
  ["日常请求", [["请你再说一遍。", "Could you say that again, please?", "say that again 表示再说一遍。"], ["请说慢一点。", "Please speak more slowly.", "more slowly 表示更慢。"], ["你可以帮我吗？", "Can you help me?", "使用 Can you...？"]]],
  ["朋友聊天", [["你周末做了什么？", "What did you do on the weekend?", "过去发生的事可用 did 提问。"], ["我喜欢这部电影。", "I like this movie.", "使用 like。"], ["我们一起去吧。", "Let's go together.", "Let's 表示让我们。"]]]
];
const pick = items => items[Math.floor(Math.random() * items.length)];
function readingQuestion(prompt, answer, other, explanation) {
  const options = [answer, ...other.filter(item => item !== answer).slice(0, 2)];
  options.sort(() => Math.random() - 0.5);
  return { prompt, options, answer: options.indexOf(answer), explanation };
}
function generateReading(avoid) {
  const stories = [
    () => {
      const day = pick([["Saturday", "周六"], ["Sunday", "周日"]]);
      const time = pick([["nine", "九点"], ["ten", "十点"], ["eleven", "十一点"]]);
      const snack = pick([["sandwiches", "三明治"], ["fruit", "水果"], ["cookies", "饼干"]]);
      return { title: `公园里的${snack[1]}`,
        passage: `On ${day[0]} morning, Mia goes to the park with her friend Ben. They meet at ${time[0]} near the bus stop. Mia brings ${snack[0]} and water, and Ben brings a red ball. First, they walk around the lake and talk about their week. Then they eat lunch under a big tree. They go home in the afternoon when it starts to rain.`,
        translation: `${day[1]}早上，米娅和朋友本去公园。他们${time[1]}在公交车站附近见面。米娅带了${snack[1]}和水，本带了一个红球。他们先沿着湖散步，聊这一周的事。然后他们在一棵大树下吃午饭。下午开始下雨时，他们就回家了。`,
        questions: [readingQuestion("他们哪天去公园？", day[1], ["周六", "周日", "周一"], `短文开头说他们${day[1]}去公园。`),
          readingQuestion("他们几点见面？", time[1], ["九点", "十点", "十一点"], `他们约在${time[1]}见面。`),
          readingQuestion("米娅带了什么吃的？", snack[1], ["三明治", "水果", "饼干"], `米娅带了${snack[1]}和水。`)] };
    },
    () => {
      const drink = pick([["cup of tea", "茶"], ["cup of coffee", "咖啡"], ["glass of orange juice", "橙汁"]]);
      const price = pick([["three", "三"], ["four", "四"], ["five", "五"]]);
      return { title: `咖啡店的${drink[1]}`,
        passage: `After school, Lily walks into a small café with her friend Tom. She looks at the menu and orders a ${drink[0]}. Tom asks for a glass of water. The worker says Lily's drink costs ${price[0]} dollars. They sit by the window and talk about their plans for the weekend. Before leaving, Lily thanks the worker and takes the empty cups to the counter.`,
        translation: `放学后，莉莉和朋友汤姆走进一家小咖啡店。她看了菜单，点了一杯${drink[1]}。汤姆要了一杯水。店员说莉莉的饮料要${price[1]}美元。他们坐在窗边，聊周末的计划。离开前，莉莉向店员道谢，并把空杯子拿到柜台。`,
        questions: [readingQuestion("莉莉点了什么？", drink[1], ["茶", "咖啡", "橙汁"], `莉莉点了${drink[1]}。`),
          readingQuestion("她的饮料多少钱？", `${price[1]}美元`, ["三美元", "四美元", "五美元"], `店员说饮料要${price[1]}美元。`),
          readingQuestion("他们坐在哪里？", "窗边", ["门口", "窗边", "楼上"], "短文说他们坐在窗边。")] };
    },
    () => {
      const topic = pick([["animals", "动物"], ["space", "太空"], ["cities", "城市"]]);
      const returnDay = pick([["Monday", "周一"], ["Friday", "周五"], ["Sunday", "周日"]]);
      return { title: `图书馆的${topic[1]}书`,
        passage: `On Tuesday, Ben visits the library after lunch. He wants a book about ${topic[0]} because he has a school project. The librarian shows him a shelf near the window. Ben reads the first page and decides to borrow the book. He must bring it back on ${returnDay[0]}. Before he leaves, he writes the date in his notebook so he will not forget.`,
        translation: `周二午饭后，本去了图书馆。他因为学校作业想找一本关于${topic[1]}的书。图书管理员带他看了窗边的书架。本读了第一页，决定借这本书。他必须在${returnDay[1]}归还。离开前，他把日期写在笔记本里，以免忘记。`,
        questions: [readingQuestion("本想借关于什么的书？", topic[1], ["动物", "太空", "城市"], `本要找一本关于${topic[1]}的书。`),
          readingQuestion("书架在哪里？", "窗边", ["门口", "窗边", "楼上"], "图书管理员带本看窗边的书架。"),
          readingQuestion("他必须哪天还书？", returnDay[1], ["周一", "周五", "周日"], `还书的日子是${returnDay[1]}。`)] };
    },
    () => {
      const item = pick([["shirt", "衬衫"], ["jacket", "夹克"], ["hat", "帽子"]]);
      const color = pick([["blue", "蓝色"], ["green", "绿色"], ["red", "红色"]]);
      const price = pick([["ten", "十"], ["twenty", "二十"], ["thirty", "三十"]]);
      return { title: `${color[1]}的${item[1]}`,
        passage: `Anna goes to a clothes shop on Saturday afternoon. She needs something new for a family party. A ${color[0]} ${item[0]} catches her eye, so she asks the worker for her size. The worker brings it to her, and Anna tries it on. It feels comfortable and costs ${price[0]} dollars. Anna pays at the counter and puts the ${item[0]} in her bag. She is happy with her choice.`,
        translation: `周六下午，安娜去了一家服装店。她需要为家庭聚会买一件新东西。一${item[1] === "帽子" ? "顶" : "件"}${color[1]}${item[1]}吸引了她，于是她向店员询问自己的尺码。店员把它拿给她，安娜试穿了一下。它很舒服，价格是${price[1]}美元。安娜在柜台付款，把${item[1]}放进包里。她很满意自己的选择。`,
        questions: [readingQuestion("安娜看中了什么？", item[1], ["衬衫", "夹克", "帽子"], `安娜看中了一${item[1] === "帽子" ? "顶" : "件"}${item[1]}。`),
          readingQuestion("它是什么颜色？", color[1], ["蓝色", "绿色", "红色"], `她选择的是${color[1]}的。`),
          readingQuestion("它多少钱？", `${price[1]}美元`, ["十美元", "二十美元", "三十美元"], `价格是${price[1]}美元。`)] };
    },
    () => {
      const destination = pick([["museum", "博物馆"], ["market", "市场"], ["library", "图书馆"]]);
      const time = pick([["eight", "八点"], ["nine", "九点"], ["ten", "十点"]]);
      return { title: `去${destination[1]}的公交车`,
        passage: `Tom takes a bus to the ${destination[0]} on Friday morning. He gets to the bus stop at ${time[0]} and checks the number on the bus. The driver tells him that this bus goes to the ${destination[0]}. Tom pays, sits near the front, and watches the streets outside. After about twenty minutes, the driver calls out his stop. Tom thanks the driver and gets off the bus.`,
        translation: `周五早上，汤姆乘公交车去${destination[1]}。他${time[1]}到达车站，核对了公交车的号码。司机告诉他，这辆车去${destination[1]}。汤姆付了车费，坐在前排附近，看着窗外的街道。大约二十分钟后，司机报出他要下车的站。汤姆向司机道谢，然后下车。`,
        questions: [readingQuestion("汤姆要去哪里？", destination[1], ["博物馆", "市场", "图书馆"], `汤姆要乘车去${destination[1]}。`),
          readingQuestion("他几点到车站？", time[1], ["八点", "九点", "十点"], `汤姆${time[1]}到了车站。`),
          readingQuestion("车程大约多久？", "二十分钟", ["十分钟", "二十分钟", "半小时"], "短文说车程大约二十分钟。")] };
    },
    () => {
      const place = pick([["zoo", "动物园"], ["beach", "海滩"], ["park", "公园"]]);
      const day = pick([["Saturday", "周六"], ["Sunday", "周日"]]);
      return { title: `${place[1]}的周末`,
        passage: `On ${day[0]}, Sara and her younger brother visit the ${place[0]} with their parents. They leave home after breakfast and take a train across town. Sara brings a camera because she wants to take pictures. Her brother carries a small bag with water and snacks. They spend the morning walking together and talking about what they see. In the afternoon, they buy ice cream before going home. Everyone feels tired but happy.`,
        translation: `${day[1]}，萨拉和弟弟跟父母一起去${place[1]}。他们吃过早饭后出门，乘火车穿过城市。萨拉带了相机，因为她想拍照。弟弟提着一个小包，里面有水和零食。他们上午一起边走边聊看到的东西。下午回家前，他们买了冰激凌。大家都累了，但很开心。`,
        questions: [readingQuestion("他们去了哪里？", place[1], ["动物园", "海滩", "公园"], `他们一家去了${place[1]}。`),
          readingQuestion("萨拉带了什么？", "相机", ["相机", "雨伞", "书"], "萨拉带相机是为了拍照。"),
          readingQuestion("回家前他们买了什么？", "冰激凌", ["蛋糕", "冰激凌", "果汁"], "他们回家前买了冰激凌。")] };
    }
  ];
  let result;
  for (let attempt = 0; attempt < 8; attempt++) {
    result = pick(stories)();
    if (!avoid.includes(result.title)) break;
  }
  return result;
}

function reply(data, status = 200, origin = SITE) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "cache-control": "no-store"
    }
  });
}

export async function handleRequest(request, env) {
  const origin = request.headers.get("origin");
  if (origin !== SITE) return reply({ error: "不允许此网站访问。" }, 403);
  if (request.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": SITE,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-wordspring-passcode",
      "access-control-max-age": "600"
    }
  });
  if (request.method !== "POST") return reply({ error: "请求方式不正确。" }, 405);
  if (!env.PASSCODE || request.headers.get("x-wordspring-passcode") !== env.PASSCODE) {
    return reply({ error: "口令不正确。" }, 401);
  }
  if (!env.AI) return reply({ error: "AI 服务尚未配置。" }, 503);

  const path = new URL(request.url).pathname;
  try {
    if (path === "/chat") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "对话太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "对话太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "对话内容无效。" }, 400); }
      if (!input || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 9 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400)) {
        return reply({ error: "对话内容无效。" }, 400);
      }
      const topic = ["日常交流", "点餐", "问路", "自由聊天"].includes(input.topic) ? input.topic : "日常交流";
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: `You are a patient English conversation partner for a Chinese beginner. Topic: ${topic}. Reply in exactly two lines. Line 1: one or two short, natural A1 English sentences, including one simple follow-up question. Line 2: one short Simplified Chinese hint, beginning with “中文提示：”. The English line must come first even when the learner writes Chinese or earlier assistant messages are in Chinese. If the learner writes Chinese, first show a natural English expression. Never claim to grade pronunciation or to have heard audio.` },
          ...input.messages
        ],
        max_tokens: 180,
        temperature: 0.5
      });
      let answer = typeof result.response === "string" ? result.response.trim() : "";
      const englishFirst = value => /^[^\n\u3400-\u9fff]*[A-Za-z]{2,}[^\n\u3400-\u9fff]*(?:\n|$)/.test(value);
      if (answer && !englishFirst(answer)) {
        const corrected = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: "Rewrite the given reply for a beginner learning English. First line: simple conversational English with one short follow-up question. Second line: one brief Simplified Chinese hint starting with 中文提示：. Never put Chinese before the English line." },
            { role: "user", content: answer.slice(0, 1200) }
          ],
          max_tokens: 180,
          temperature: 0.3
        });
        answer = typeof corrected.response === "string" ? corrected.response.trim() : "";
      }
      return englishFirst(answer) ? reply({ answer: simplify(answer).slice(0, 1200) }) : reply({ error: "AI 没有返回英文，请再试一次。" }, 502);
    }
    if (path === "/translate") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "翻译内容太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "翻译内容太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "翻译内容无效。" }, 400); }
      if (!input || !["zh-en", "en-zh"].includes(input.direction) || typeof input.text !== "string" || !input.text.trim() || input.text.length > 400) {
        return reply({ error: "翻译内容无效。" }, 400);
      }
      const toEnglish = input.direction === "zh-en";
      const source = input.text.trim();
      const result = await env.AI.run(TRANSLATION_MODEL, {
        text: source,
        source_lang: toEnglish ? "zh" : "en",
        target_lang: toEnglish ? "en" : "zh"
      });
      const translation = typeof result.translated_text === "string" ? simplify(result.translated_text.trim()) : "";
      return (toEnglish ? /[A-Za-z]/.test(translation) : /[\u3400-\u9fff]/.test(translation))
        ? reply({ source, translation: translation.slice(0, 1600) })
        : reply({ error: "AI 没有返回译文，请再试一次。" }, 502);
    }
    if (path === "/teach") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "内容太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "内容太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "教学内容无效。" }, 400); }
      if (!input || !["ask", "correct"].includes(input.mode) || !Array.isArray(input.messages) ||
          input.messages.length < 1 || input.messages.length > 7 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400) ||
          input.messages.at(-1).role !== "user") {
        return reply({ error: "教学内容无效。" }, 400);
      }
      const asking = input.mode === "ask";
      const fields = asking ? ["answer", "example", "meaning"] : ["corrected", "meaning", "reason", "reply", "hint"];
      const prompt = asking
        ? "You are a patient English teacher for a Chinese absolute beginner. Put only the direct explanation in answer, using one or two short Simplified Chinese sentences. Put exactly one simple A1 English sentence in example and its Simplified Chinese translation in meaning. Do not repeat the example or translation inside answer. Use previous turns only to understand follow-up questions. Do not pretend to assess pronunciation. No field may be empty. Return only the requested JSON fields."
        : "You are a patient English conversation tutor for a Chinese absolute beginner. For the learner's latest message, correct at most one important English error. The corrected field must contain a complete English sentence. The meaning field must contain its short Simplified Chinese translation. The reason field must ALWAYS contain one short Simplified Chinese sentence explaining the change. If the English is natural, copy it exactly into corrected and write '这句话自然，无需修改。' in reason; do not force punctuation or style changes. If the learner wrote Chinese, put a natural simple English equivalent in corrected and write '这是对应的英文表达。' in reason. Then continue with one short A1 English sentence or question in reply. The hint field must ALWAYS contain a short Simplified Chinese translation of reply. No field may be empty. Judge the text only; never claim to assess pronunciation. Return only the requested JSON fields.";
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, ...input.messages],
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: Object.fromEntries(fields.map(field => [field, { type: "string", minLength: 1 }])),
            required: fields,
            additionalProperties: false
          }
        },
        max_tokens: 320,
        temperature: 0.2
      });
      let output = result.response;
      if (typeof output === "string") {
        try { output = JSON.parse(output); } catch { output = null; }
      }
      if (!output || fields.some(field => typeof output[field] !== "string" || !output[field].trim()) ||
          !(asking ? /[A-Za-z]/.test(output.example) : /[A-Za-z]/.test(output.corrected) && /[A-Za-z]/.test(output.reply))) {
        return reply({ error: "AI 没有生成完整的教学内容，请再试一次。" }, 502);
      }
      const teaching = Object.fromEntries(fields.map(field => [field, simplify(output[field].trim()).slice(0, 800)]));
      return reply({ mode: input.mode, source: input.messages.at(-1).content.trim(), ...teaching });
    }
    if (path === "/listening") {
      if (Number(request.headers.get("content-length")) > 1000) return reply({ error: "听力请求太长。" }, 413);
      const body = await request.text();
      if (body.length > 1000) return reply({ error: "听力请求太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "听力请求无效。" }, 400); }
      if (!input || !["入门", "基础", "进阶"].includes(input.level) || !Array.isArray(input.avoid) ||
          input.avoid.length > 5 || input.avoid.some(title => typeof title !== "string" || title.length > 40))
        return reply({ error: "听力请求无效。" }, 400);
      const scenes = ["咖啡店", "公交站", "超市", "图书馆", "酒店", "公园", "餐厅", "机场", "药店", "周末计划", "朋友见面", "购物", "天气", "看电影", "约时间", "询问价格", "找洗手间", "学校", "打电话", "点外卖"];
      const scene = scenes[Math.floor(Math.random() * scenes.length)];
      const levelGuide = { 入门: "A1: 3 very short lines, about 4–8 words per English line.", 基础: "A1–A2: 4 lines, about 5–12 words per English line.", 进阶: "A2: 4 lines, about 7–15 words per English line." };
      const prompt = `Create a fresh listening exercise for a Chinese learner. Level ${input.level}. ${levelGuide[input.level]} Everyday scenario: ${scene}. Avoid repeating these titles or the same situation: ${input.avoid.join("、") || "none"}. Write a natural alternating A/B English dialogue and an accurate Simplified Chinese translation for every line. The Chinese title and question must be short. Ask one factual comprehension question answered unambiguously by the dialogue. Give exactly 3 distinct Simplified Chinese options, with one correct answer; answer is its zero-based index. No phonetic transcription or pronunciation score. Return only the requested JSON.`;
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, { role: "user", content: `Generate a different ${input.level} listening practice now.` }],
        response_format: { type: "json_schema", json_schema: { type: "object", properties: {
          title: { type: "string" },
          lines: { type: "array", minItems: 3, maxItems: 4, items: { type: "object", properties: {
            speaker: { type: "string", enum: ["A", "B"] }, en: { type: "string" }, zh: { type: "string" }
          }, required: ["speaker", "en", "zh"], additionalProperties: false } },
          question: { type: "string" }, options: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
          answer: { type: "integer", minimum: 0, maximum: 2 }
        }, required: ["title", "lines", "question", "options", "answer"], additionalProperties: false } },
        max_tokens: 650, temperature: 0.65
      });
      let output = result.response;
      if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
      if (!output || typeof output.title !== "string" || !/[\u3400-\u9fff]/.test(output.title) ||
          !Array.isArray(output.lines) || output.lines.length < 3 || output.lines.length > 4 ||
          output.lines.some((line, index) => !line || line.speaker !== (index % 2 ? "B" : "A") ||
            typeof line.en !== "string" || !/[A-Za-z]/.test(line.en) || typeof line.zh !== "string" || !/[\u3400-\u9fff]/.test(line.zh)) ||
          typeof output.question !== "string" || !/[\u3400-\u9fff]/.test(output.question) ||
          !Array.isArray(output.options) || output.options.length !== 3 ||
          output.options.some(option => typeof option !== "string" || !option.trim()) ||
          new Set(output.options).size !== 3 || !Number.isInteger(output.answer) || output.answer < 0 || output.answer > 2)
        return reply({ error: "这次听力内容生成不完整，请再试一次。" }, 502);
      return reply({ level: input.level, title: simplify(output.title.trim()).slice(0, 60),
        lines: output.lines.map(line => [line.speaker, line.en.trim().slice(0, 180), simplify(line.zh.trim()).slice(0, 180)]),
        question: simplify(output.question.trim()).slice(0, 180),
        options: output.options.map(option => simplify(option.trim()).slice(0, 100)), answer: output.answer });
    }
    if (path === "/knowledge") {
      if (Number(request.headers.get("content-length")) > 3000) return reply({ error: "练习请求太长。" }, 413);
      const body = await request.text();
      if (body.length > 3000) return reply({ error: "练习请求太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "练习请求无效。" }, 400); }
      if (input && input.action === "check") {
        if (input.mode !== "translate" || ["source", "reference", "answer"].some(key => typeof input[key] !== "string" || !input[key].trim() || input[key].length > 300))
          return reply({ error: "翻译答案无效。" }, 400);
        const result = await env.AI.run(TEACH_MODEL, {
          messages: [{ role: "system", content: "Decide whether the learner's English conveys the Chinese source naturally enough. Accept valid alternatives to the reference. Ignore minor punctuation and capitalization. Return only JSON with acceptable as boolean." },
            { role: "user", content: `中文原句：${input.source}\n参考表达：${input.reference}\n学习者写的英文：${input.answer}` }],
          response_format: { type: "json_schema", json_schema: { type: "object", properties: {
            acceptable: { type: "boolean" }
          }, required: ["acceptable"], additionalProperties: false } },
          max_tokens: 50, temperature: 0.1
        });
        let output = result.response;
        if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
        if (!output || typeof output.acceptable !== "boolean") return reply({ error: "评改没有完成，请再试一次。" }, 502);
        return reply({ acceptable: output.acceptable,
          feedback: output.acceptable ? "意思表达正确，可以继续下一句。" : "这句与原意还有差别，请对照参考表达学习。",
          improved: output.acceptable ? input.answer.trim() : input.reference.trim(), reference: input.reference.trim() });
      }
      if (!input || input.action !== "generate" || !["words", "grammar", "translate", "reading"].includes(input.mode) ||
          !Array.isArray(input.avoid) || input.avoid.length > (input.mode === "words" ? 20 : 5) || input.avoid.some(title => typeof title !== "string" || title.length > 60) ||
          (input.mode === "grammar" && (!Number.isInteger(input.topic) || input.topic < 0 || input.topic >= GRAMMAR_TOPICS.length)))
        return reply({ error: "练习请求无效。" }, 400);
      if (input.mode === "grammar") {
        const [title, rule] = GRAMMAR_TOPICS[input.topic];
        const practice = GRAMMAR_PRACTICE[input.topic];
        return reply({ mode: input.mode, title, rule,
          examples: practice.examples.map(([en, zh]) => ({ en, zh })),
          questions: practice.questions.map(([prompt, options, answer]) => ({ prompt, options, answer, explanation: rule })) });
      }
      if (input.mode === "words") {
        const candidates = WORD_SETS.filter(([title]) => !input.avoid.includes(title));
        const [title, items] = pick(candidates.length ? candidates : WORD_SETS);
        return reply({ mode: input.mode, title, items: items.map(([en, zh, example, exampleZh]) => ({ en, zh, example, exampleZh })) });
      }
      if (input.mode === "translate") {
        const candidates = TRANSLATION_SETS.filter(([title]) => !input.avoid.includes(title));
        const [title, items] = (candidates.length ? candidates : TRANSLATION_SETS)[Math.floor(Math.random() * (candidates.length || TRANSLATION_SETS.length))];
        return reply({ mode: input.mode, title, items: items.map(([zh, reference, hint]) => ({ zh, reference, hint })) });
      }
      if (input.mode === "reading") return reply({ mode: input.mode, ...generateReading(input.avoid) });
    }
    if (path === "/roleplay") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "任务对话太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "任务对话太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "任务对话内容无效。" }, 400); }
      const scenes = {
        cafe: "You are a café clerk. The learner must order a drink, say its size, and ask or confirm its price.",
        directions: "You are a local resident. The learner must ask how to reach the library and confirm a direction.",
        shop: "You are a shop clerk. The learner must ask for an item, ask about its size, and say they will buy it.",
        hotel: "You are a hotel receptionist. The learner must check in and ask about breakfast time."
      };
      const examples = {
        cafe: "I'd like a small coffee, please. How much is it?",
        directions: "Could you tell me how to get to the library?",
        shop: "Do you have this in medium? I'll take it.",
        hotel: "I'd like to check in. What time is breakfast?"
      };
      if (!input || !Object.hasOwn(scenes, input.scene) || !Number.isInteger(input.turn) || input.turn < 1 || input.turn > 5 ||
          !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 9 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400) ||
          input.messages.at(-1).role !== "user") return reply({ error: "任务对话内容无效。" }, 400);
      const prompt = `You are a patient A1 English roleplay partner for a Chinese absolute beginner. ${scenes[input.scene]} Reply as the character, using one short natural English sentence or question in reply. Put a short Simplified Chinese translation of reply in hint. Set completed to true only if the learner has achieved every task goal. If a learner writes Chinese, show a natural English expression and continue the roleplay. Never assess pronunciation. Turn ${input.turn} of 5. Return only the requested JSON fields.`;
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, ...input.messages],
        response_format: { type: "json_schema", json_schema: { type: "object", properties: {
          reply: { type: "string", minLength: 1 }, hint: { type: "string", minLength: 1 },
          completed: { type: "boolean" }
        }, required: ["reply", "hint", "completed"], additionalProperties: false } },
        max_tokens: 160, temperature: 0.2
      });
      let output = result.response;
      if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
      if (!output || typeof output.completed !== "boolean" || typeof output.reply !== "string" || !/[A-Za-z]/.test(output.reply))
        return reply({ error: "任务对话未生成完整回复，请重试。" }, 502);
      const completed = input.turn >= 3 && output.completed;
      const finished = completed || input.turn === 5;
      let hint = typeof output.hint === "string" ? simplify(output.hint.trim()) : "";
      if (!/[\u3400-\u9fff]/.test(hint)) {
        const translated = await env.AI.run(TRANSLATION_MODEL, { text: output.reply.trim(), source_lang: "en", target_lang: "zh" });
        hint = typeof translated.translated_text === "string" ? simplify(translated.translated_text.trim()) : "";
      }
      if (!/[\u3400-\u9fff]/.test(hint)) hint = "请听英文回复，再用英语回答。";
      let feedback = "继续练习用完整句子表达自己的需求。";
      let better = examples[input.scene];
      if (finished) {
        const review = await env.AI.run(TEACH_MODEL, {
          messages: [{ role: "system", content: `You are an English teacher for a Chinese A1 beginner. The roleplay goal was: ${scenes[input.scene]} Give one specific, kind improvement suggestion about the learner's actual English in feedback (Simplified Chinese). Put one better complete A1 English sentence the learner could say in better. Do not assess pronunciation. Return only JSON.` },
            ...input.messages],
          response_format: { type: "json_schema", json_schema: { type: "object", properties: {
            feedback: { type: "string", minLength: 1 }, better: { type: "string", minLength: 1 }
          }, required: ["feedback", "better"], additionalProperties: false } },
          max_tokens: 140, temperature: 0.2
        });
        let suggestion = review.response;
        if (typeof suggestion === "string") { try { suggestion = JSON.parse(suggestion); } catch { suggestion = null; } }
        if (suggestion && typeof suggestion.feedback === "string" && /[\u3400-\u9fff]/.test(suggestion.feedback)) feedback = simplify(suggestion.feedback.trim());
        if (suggestion && typeof suggestion.better === "string" && /[A-Za-z]{2,}/.test(suggestion.better) && !/^none$/i.test(suggestion.better.trim())) better = suggestion.better.trim();
      }
      return reply({ scene: input.scene, reply: output.reply.trim().slice(0, 500), hint: hint.slice(0, 500),
        completed, finished, feedback: feedback.slice(0, 500), better: better.slice(0, 500) });
    }
    if (path === "/transcribe") {
      if (!/^audio\/(mp4|mpeg|wav|webm|x-m4a)(?:;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "录音格式不支持。" }, 415);
      if (Number(request.headers.get("content-length")) > 2_000_000) return reply({ error: "录音太大，请缩短到 20 秒以内。" }, 413);
      const audio = await request.arrayBuffer();
      if (!audio.byteLength || audio.byteLength > 2_000_000) return reply({ error: "录音太大或为空。" }, 413);
      const result = await env.AI.run(SPEECH_MODEL, { audio: [...new Uint8Array(audio)] });
      const transcript = typeof result.text === "string" ? simplify(result.text.trim()) : "";
      return transcript ? reply({ transcript: transcript.slice(0, 400) }) : reply({ error: "没有听清，请再说一遍。" }, 422);
    }
    return reply({ error: "功能不存在。" }, 404);
  } catch (error) {
    const limited = /quota|limit|capacity|neurons|429|3040/i.test(String(error));
    return reply({ error: limited ? "今日免费额度已用完，请明天再试。" : "服务暂时不可用，请稍后重试。" }, limited ? 429 : 502);
  }
}

export default { fetch: handleRequest };
