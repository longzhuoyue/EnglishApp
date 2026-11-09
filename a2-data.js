const A2_CHAPTERS = ["过去的生活", "未来与安排", "生活服务", "人与比较", "城市与旅行", "交流与意见", "综合应用"];
const a2q = (prompt, right, wrong1, wrong2, why) => ({ prompt, options: [right, wrong1, wrong2], answer: 0, ...(why ? { why } : {}) });
const a2clip = (a, az, b, bz, prompt, right, wrong1, wrong2) => ({
  dialogue: [["A", a, az], ["B", b, bz]], ...a2q(prompt, right, wrong1, wrong2)
});

const A2_SPECS = [
  {
    chapter: 0, title: "昨天的活动", goal: "用一般过去时讲述昨天做过的事。",
    words: [["walked", "走了"], ["watched", "看了"], ["cleaned", "打扫了"], ["cooked", "做了饭"], ["visited", "拜访了"], ["yesterday", "昨天"]],
    rule: "规则动词的过去式通常加 -ed；说昨天的事用 yesterday。",
    examples: [["I watched a film yesterday.", "我昨天看了一部电影。"], ["She visited her aunt.", "她拜访了姑妈。"]],
    clips: [
      a2clip("What did you do yesterday?", "你昨天做了什么？", "I watched a film after dinner.", "我晚饭后看了电影。", "第二个人什么时候看电影？", "晚饭后", "早饭前", "中午"),
      a2clip("Did you clean your room?", "你打扫房间了吗？", "Yes, I cleaned it in the morning.", "打扫了，我早上打扫的。", "房间什么时候被打扫？", "早上", "晚上", "下午"),
      a2clip("Who did you visit yesterday?", "你昨天拜访了谁？", "I visited my aunt and cooked with her.", "我拜访了姑妈，还和她一起做饭。", "第二个人拜访了谁？", "姑妈", "老师", "邻居")
    ],
    grammar: [a2q("I ___ a film yesterday.", "watched", "watch", "watching", "yesterday 提示用过去式 watched。"), a2q("She ___ her aunt last night.", "visited", "visit", "visiting", "规则动词 visit 的过去式是 visited。"), a2q("We ___ dinner together.", "cooked", "cook", "cooking", "讲述已经发生的事用 cooked。")],
    reading: { en: "Yesterday, Mei walked to her aunt's house. They cooked lunch together and watched a short film in the afternoon. Mei cleaned the kitchen before she went home. She felt tired but happy.", zh: "昨天梅步行去姑妈家。她们一起做午饭，下午看了一部短片。梅回家前打扫了厨房。她累了，但很开心。",
      questions: [a2q("梅怎样去姑妈家？", "步行", "乘公交", "骑车"), a2q("她们下午做了什么？", "看短片", "做早餐", "去购物"), a2q("梅回家前打扫了哪里？", "厨房", "卧室", "花园")] },
    output: { prompt: "用 2—3 句英文讲述你昨天做的两件事。", sample: "I walked to the park yesterday. I cooked dinner at home." }
  },
  {
    chapter: 0, title: "不规则过去式", goal: "说出常见不规则动词的过去式。",
    words: [["went", "去了"], ["saw", "看见了"], ["ate", "吃了"], ["bought", "买了"], ["took", "乘坐了；拿了"], ["had", "有了；吃了"]],
    rule: "go→went、see→saw、eat→ate 等过去式不能直接加 -ed。",
    examples: [["I went to the market.", "我去了市场。"], ["She bought some fruit.", "她买了些水果。"]],
    clips: [
      a2clip("Where did you go on Saturday?", "你周六去哪了？", "I went to the market and bought apples.", "我去市场买了苹果。", "第二个人买了什么？", "苹果", "面包", "车票"),
      a2clip("Did you see the new film?", "你看新电影了吗？", "Yes, I saw it and ate popcorn.", "看了，我还吃了爆米花。", "第二个人看电影时吃了什么？", "爆米花", "面条", "苹果"),
      a2clip("How did you get home?", "你怎么回家的？", "I took the bus and got home at six.", "我坐公交，六点到家。", "第二个人乘什么回家？", "公交车", "火车", "出租车")
    ],
    grammar: [a2q("Yesterday I ___ to the market.", "went", "go", "goed", "go 的过去式是不规则变化 went。"), a2q("She ___ a red bag last week.", "bought", "buy", "buyed", "buy 的过去式是 bought。"), a2q("We ___ breakfast at seven.", "had", "have", "haved", "have 的过去式是 had。")],
    reading: { en: "Last Sunday, Ben went to the city center with his sister. They saw a street show and bought two small books. At noon, they ate noodles in a quiet restaurant. They took the bus home.", zh: "上周日，本和妹妹去了市中心。他们看了街头表演，买了两本小书。中午在一家安静的餐厅吃面条，之后乘公交回家。",
      questions: [a2q("本和谁去了市中心？", "妹妹", "母亲", "朋友"), a2q("他们买了什么？", "两本小书", "两个包", "两张车票"), a2q("他们怎么回家？", "乘公交", "步行", "乘火车")] },
    output: { prompt: "用 went、saw、ate 或 bought 中的两个词讲述一次经历。", sample: "I went to the park and saw my friend. We ate lunch together." }
  },
  {
    chapter: 0, title: "周末经历", goal: "询问并讲述上周末的一次活动。",
    words: [["weekend", "周末"], ["trip", "短途旅行"], ["beach", "海滩"], ["museum", "博物馆"], ["enjoyed", "享受了"], ["stayed", "待了"]],
    rule: "询问过去的活动用 Did you + 动词原形？回答可说 Yes, I did / No, I didn't。",
    examples: [["Did you enjoy the trip?", "你喜欢这次旅行吗？"], ["I stayed at home on Sunday.", "周日我待在家里。"]],
    clips: [
      a2clip("Did you go to the beach last weekend?", "上周末你去海滩了吗？", "No, I visited a museum instead.", "没有，我去了博物馆。", "第二个人去了哪里？", "博物馆", "海滩", "公园"),
      a2clip("How was your weekend trip?", "你的周末短途旅行怎么样？", "It was great. We stayed by the lake.", "很棒。我们待在湖边。", "他们待在什么地方？", "湖边", "海边", "山上"),
      a2clip("Did you enjoy the show?", "你喜欢那场表演吗？", "Yes, I did. I watched it with my brother.", "喜欢。我和兄弟一起看的。", "第二个人和谁看了表演？", "兄弟", "姐姐", "朋友")
    ],
    grammar: [a2q("Did you ___ the museum?", "visit", "visited", "visiting", "Did 后用动词原形 visit。"), a2q("No, I ___.", "didn't", "don't", "wasn't", "回答 Did 开头的问题可用 didn't。"), a2q("Did she ___ at home?", "stay", "stayed", "stays", "Did 后用动词原形 stay。")],
    reading: { en: "On Saturday, Lina and her friends took a short trip to a lake. They walked around it and took many photos. On Sunday, Lina stayed at home because it rained. She still enjoyed her weekend.", zh: "周六莉娜和朋友们短途去了湖边。他们绕湖散步，拍了许多照片。周日因为下雨，莉娜待在家里。她仍然度过了愉快的周末。",
      questions: [a2q("他们周六去了哪里？", "湖边", "海滩", "博物馆"), a2q("他们在湖边做了什么？", "散步并拍照", "购物并吃饭", "坐船并游泳"), a2q("莉娜周日为什么待在家？", "下雨了", "她生病了", "她要上班")] },
    output: { prompt: "讲述上周末去的地方和做的一件事，再说感受。", sample: "I went to a museum last weekend. I saw many pictures. It was interesting." }
  },
  {
    chapter: 0, title: "过去的时间与地点", goal: "说明过去何时何地发生了什么。",
    words: [["ago", "以前"], ["last night", "昨晚"], ["before", "之前"], ["after", "之后"], ["was", "是；过去式"], ["were", "是；过去式复数"]],
    rule: "I/he/she/it 用 was；you/we/they 用 were。常与 last night、two days ago 连用。",
    examples: [["I was at home last night.", "我昨晚在家。"], ["They were at the station two days ago.", "两天前他们在车站。"]],
    clips: [
      a2clip("Where were you last night?", "你昨晚在哪里？", "I was at home with my family.", "我和家人在家。", "第二个人昨晚在哪里？", "家里", "车站", "学校"),
      a2clip("Was the shop open yesterday?", "商店昨天开门吗？", "No, it was closed after lunch.", "没有，午饭后就关门了。", "商店什么时候关门？", "午饭后", "早饭前", "深夜"),
      a2clip("Were they at the park two days ago?", "两天前他们在公园吗？", "Yes, they were there with Ben.", "是的，他们和本在那里。", "他们和谁在公园？", "本", "米娅", "老师")
    ],
    grammar: [a2q("I ___ at home last night.", "was", "were", "am", "I 的过去状态用 was。"), a2q("They ___ at the station yesterday.", "were", "was", "are", "they 的过去状态用 were。"), a2q("The cafe ___ closed on Monday.", "was", "were", "is", "单数主语的过去状态用 was。")],
    reading: { en: "Two days ago, Mei and Ben were at a small station. Their train was late, so they waited in a cafe nearby. It was cold outside, but the cafe was warm. They got home after dinner.", zh: "两天前梅和本在一个小车站。火车晚点了，所以他们在附近的咖啡馆等候。外面很冷，咖啡馆却很暖和。他们晚饭后到家。",
      questions: [a2q("两天前梅和本在哪里？", "车站", "海滩", "酒店"), a2q("他们为什么在咖啡馆等？", "火车晚点", "开始下雨", "商店关门"), a2q("他们什么时候到家？", "晚饭后", "早饭前", "中午")] },
    output: { prompt: "用 was 或 were 说明你昨天的地点和当时的情况。", sample: "I was at home yesterday. My friends were at the park." }
  },
  {
    chapter: 1, title: "明天的计划", goal: "用 be going to 说出已经计划好的事。",
    words: [["plan", "计划"], ["tomorrow", "明天"], ["next week", "下周"], ["going to", "打算"], ["prepare", "准备"], ["practice", "练习"]],
    rule: "已决定的计划用 am/is/are going to + 动词原形。",
    examples: [["I'm going to study tomorrow.", "我明天打算学习。"], ["She's going to visit her friend.", "她打算去看朋友。"]],
    clips: [a2clip("What are you going to do tomorrow?", "你明天打算做什么？", "I'm going to practice English in the morning.", "我打算早上练英语。", "第二个人明早打算做什么？", "练英语", "看电影", "去购物"),
      a2clip("Is Mia going to visit us?", "米娅打算来看我们吗？", "Yes, she's going to come next week.", "是的，她打算下周来。", "米娅什么时候来？", "下周", "明天", "今晚"),
      a2clip("Are you going to cook tonight?", "你今晚打算做饭吗？", "No, I'm going to eat at a cafe.", "不，我打算在咖啡馆吃。", "第二个人今晚在哪里吃？", "咖啡馆", "家里", "学校")],
    grammar: [a2q("I ___ going to study tomorrow.", "am", "is", "are", "I 后用 am。"), a2q("She is going to ___ Ben.", "visit", "visited", "visiting", "going to 后接动词原形。"), a2q("They ___ going to travel next week.", "are", "is", "am", "they 后用 are。")],
    reading: { en: "Next Saturday, Lina is going to visit her cousin. They are going to make lunch and practice English together. Lina is preparing a few questions now. She plans to take the train in the morning and return home before dinner.", zh: "下周六莉娜打算看望表亲。她们打算一起做午饭并练英语。莉娜现在正准备几个问题。她计划早上坐火车去，晚饭前回家。",
      questions: [a2q("莉娜下周六要见谁？", "表亲", "老师", "邻居"), a2q("她们准备一起做什么？", "做午饭并练英语", "买东西并游泳", "看电影并跑步"), a2q("莉娜打算怎样去？", "坐火车", "步行", "坐公交")] },
    output: { prompt: "用 going to 写出明天的两项计划。", sample: "I'm going to practice English tomorrow. I'm going to visit a friend after lunch." }
  },
  {
    chapter: 1, title: "邀请与改期", goal: "发出邀请，并礼貌地更改约定时间。",
    words: [["invite", "邀请"], ["available", "有空的"], ["change", "更改"], ["instead", "改为"], ["appointment", "约定"], ["sorry", "抱歉"]],
    rule: "邀请可以说 Would you like to ...?；改期可说 Could we meet on Friday instead?",
    examples: [["Would you like to have lunch?", "你愿意一起吃午饭吗？"], ["Could we meet on Friday instead?", "我们能改成周五见吗？"]],
    clips: [a2clip("Would you like to see a film on Thursday?", "周四你愿意看电影吗？", "I'd love to, but I'm busy. Could we go on Friday?", "我很想去，但我忙。能改成周五吗？", "第二个人建议改到哪天？", "周五", "周四", "周六"),
      a2clip("Are you available at two?", "你两点有空吗？", "Sorry, I have an appointment. Could we meet at four instead?", "抱歉，我有约。能改四点见吗？", "第二个人建议几点见？", "四点", "两点", "六点"),
      a2clip("Can you come to dinner tonight?", "你今晚能来吃饭吗？", "Thanks for inviting me, but I can't come tonight.", "谢谢邀请，但我今晚来不了。", "第二个人能来吃晚饭吗？", "不能", "能", "还没决定")],
    grammar: [a2q("Would you like ___ have lunch?", "to", "for", "at", "would like to 后接动词。"), a2q("Could we meet on Friday ___?", "instead", "again", "ago", "instead 表示改为另一时间。"), a2q("I'd love ___, but I'm busy.", "to", "for", "at", "I'd love to 表示愿意。")],
    reading: { en: "Ben invited Mei to a concert on Saturday evening. Mei wanted to go, but she had a family dinner then. She asked if they could go on Sunday instead. Ben checked the time and agreed. They bought tickets for Sunday afternoon.", zh: "本邀请梅周六晚上去听音乐会。梅想去，但那时有家庭晚餐。她问能否改到周日。本看了时间后同意。他们买了周日下午的票。",
      questions: [a2q("梅周六晚上有什么安排？", "家庭晚餐", "英语课", "去医院"), a2q("梅建议改到哪天？", "周日", "周五", "周一"), a2q("他们最后买了什么时候的票？", "周日下午", "周六晚上", "周日早上")] },
    output: { prompt: "邀请朋友见面；如果时间不合适，礼貌地提出一个新时间。", sample: "Would you like to meet on Thursday? If you're busy, could we meet on Friday instead?" }
  },
  {
    chapter: 1, title: "天气预测", goal: "谈论对未来天气的简单预测和相应安排。",
    words: [["forecast", "预报"], ["probably", "很可能"], ["rain", "下雨"], ["sunshine", "阳光"], ["umbrella", "雨伞"], ["later", "稍后"]],
    rule: "预测未来可用 will + 动词原形；例如 It will rain tomorrow。",
    examples: [["It will rain later.", "稍后会下雨。"], ["We'll stay inside if it rains.", "如果下雨，我们会待在室内。"]],
    clips: [a2clip("What's the forecast for tomorrow?", "明天的天气预报怎样？", "It will probably rain in the afternoon.", "下午很可能下雨。", "明天下午可能怎样？", "下雨", "下雪", "晴朗"),
      a2clip("Will it be sunny on Sunday?", "周日会晴吗？", "Yes, the forecast says there will be sunshine.", "会，预报说有阳光。", "周日预计是什么天气？", "晴朗", "多云", "下雨"),
      a2clip("Should I take an umbrella?", "我该带伞吗？", "Yes, it will rain later today.", "该带，今天晚些时候会下雨。", "为什么要带伞？", "稍后会下雨", "现在下雪", "太阳很晒")],
    grammar: [a2q("It will ___ tomorrow.", "rain", "rains", "rained", "will 后接动词原形 rain。"), a2q("We ___ stay inside if it rains.", "will", "are", "did", "说未来的安排可用 will。"), a2q("Will it ___ sunny?", "be", "is", "was", "will 后接 be。")],
    reading: { en: "The forecast says Saturday will be rainy, but Sunday will be sunny. Amy and her friends planned a picnic. They decided to move it to Sunday. Amy will bring sandwiches, and her friends will bring fruit and water.", zh: "预报说周六有雨，周日晴朗。艾米和朋友们原计划野餐。他们决定改到周日。艾米会带三明治，朋友们会带水果和水。",
      questions: [a2q("周六预计是什么天气？", "下雨", "晴朗", "下雪"), a2q("他们把野餐改到哪天？", "周日", "周六", "周一"), a2q("艾米会带什么？", "三明治", "水果", "水")] },
    output: { prompt: "根据天气预测写出一个明天的安排。", sample: "It will probably rain tomorrow, so I will stay inside and read." }
  },
  {
    chapter: 1, title: "旅行准备", goal: "说明出行前需要做的事情。",
    words: [["passport", "护照"], ["ticket", "车票"], ["pack", "打包"], ["luggage", "行李"], ["need to", "需要"], ["before", "在……之前"]],
    rule: "表示必须准备某事可说 I need to + 动词原形。",
    examples: [["I need to pack my bag.", "我需要打包。"], ["We need to buy tickets before Friday.", "我们需要在周五前买票。"]],
    clips: [a2clip("Are you ready for the trip?", "旅行准备好了吗？", "Not yet. I need to pack my luggage.", "还没。我需要打包行李。", "第二个人还需要做什么？", "打包行李", "订酒店", "看医生"),
      a2clip("Do we have train tickets?", "我们有火车票吗？", "No, we need to buy them before Friday.", "没有，我们需要在周五前买。", "什么时候之前要买票？", "周五前", "周六后", "今晚"),
      a2clip("Where is your passport?", "你的护照在哪里？", "It's in my small blue bag.", "在我的蓝色小包里。", "护照在哪里？", "蓝色小包里", "行李箱里", "桌上")],
    grammar: [a2q("I need to ___ my bag.", "pack", "packed", "packing", "need to 后接动词原形。"), a2q("We need ___ buy tickets.", "to", "for", "at", "need to 表示需要做某事。"), a2q("She needs to ___ her passport.", "find", "finds", "found", "needs to 后接动词原形。")],
    reading: { en: "Lina is going to travel on Friday. She needs to buy a train ticket and pack her luggage. She has already put her passport in a safe place. On Thursday evening, she will check the train time and charge her phone.", zh: "莉娜周五要旅行。她需要买火车票并打包行李。护照已经放在安全的地方。周四晚上她会确认列车时间并给手机充电。",
      questions: [a2q("莉娜哪天出发？", "周五", "周四", "周六"), a2q("她已经把什么放好？", "护照", "车票", "手机"), a2q("她周四晚上会做什么？", "确认列车时间并充电", "打扫厨房", "看电影")] },
    output: { prompt: "写出出门旅行前你需要做的两件事。", sample: "I need to buy a ticket and pack my bag before Friday." }
  },
  {
    chapter: 2, title: "餐厅特殊要求", goal: "点餐时说明过敏、忌口或其他需求。",
    words: [["allergic", "过敏的"], ["without", "不加"], ["spicy", "辣的"], ["vegetarian", "素食的"], ["ingredient", "配料"], ["change", "更换"]],
    rule: "说明忌口可说 I'm allergic to ... 或 Could I have it without ...?",
    examples: [["I'm allergic to nuts.", "我对坚果过敏。"], ["Could I have it without onions?", "可以不加洋葱吗？"]],
    clips: [a2clip("Are there nuts in this cake?", "这块蛋糕里有坚果吗？", "Yes, there are. Would you like a different dessert?", "有。您要换一种甜点吗？", "蛋糕里有什么？", "坚果", "洋葱", "米饭"),
      a2clip("Could I have the soup without onions?", "这汤可以不加洋葱吗？", "Of course. I'll tell the cook.", "当然，我会告诉厨师。", "客人不想要什么？", "洋葱", "胡椒", "牛奶"),
      a2clip("Is this dish very spicy?", "这道菜很辣吗？", "A little. We can make it less spicy.", "有一点。我们可以做得不那么辣。", "服务员能怎样调整菜品？", "少放辣椒", "多放盐", "不加水")],
    grammar: [a2q("I'm allergic ___ nuts.", "to", "for", "with", "对某物过敏用 allergic to。"), a2q("Could I have it ___ onions?", "without", "under", "between", "without 表示不加。"), a2q("Could you make it ___ spicy?", "less", "many", "few", "less spicy 表示少辣一点。")],
    reading: { en: "At a cafe, Tom asked about the ingredients in a sandwich. He was allergic to nuts and did not want spicy sauce. The waiter checked with the cook and suggested a simple chicken sandwich without sauce. Tom thanked him.", zh: "在咖啡馆里，汤姆询问三明治的配料。他对坚果过敏，也不想要辣酱。服务员向厨师确认后，推荐了不加酱的鸡肉三明治。汤姆向他道谢。",
      questions: [a2q("汤姆对什么过敏？", "坚果", "鸡肉", "面包"), a2q("汤姆不想要什么？", "辣酱", "鸡肉", "水"), a2q("服务员推荐了什么？", "不加酱的鸡肉三明治", "辣汤", "坚果蛋糕")] },
    output: { prompt: "在餐厅说明一种饮食需求，并礼貌地请求调整菜品。", sample: "I'm allergic to nuts. Could I have this sandwich without nuts, please?" }
  },
  {
    chapter: 2, title: "购物退换", goal: "说明商品问题并询问能否退换。",
    words: [["return", "退货"], ["exchange", "换货"], ["receipt", "收据"], ["size", "尺码"], ["broken", "坏的"], ["refund", "退款"]],
    rule: "提出退换要求可说 I'd like to return/exchange this ...，并简要说明原因。",
    examples: [["I'd like to exchange this shirt.", "我想换这件衬衫。"], ["It's too small for me.", "它对我来说太小了。"]],
    clips: [a2clip("Why would you like to exchange the shirt?", "你为什么想换这件衬衫？", "It's too small. Do you have a larger size?", "太小了。有大一号的吗？", "顾客需要什么尺码？", "大一号", "小一号", "同样尺码"),
      a2clip("I'd like to return this lamp. It is broken.", "我想退这盏灯，它坏了。", "Do you have the receipt?", "你有收据吗？", "顾客想退什么？", "台灯", "衬衫", "书"),
      a2clip("Can I get a refund for these shoes?", "这双鞋能退款吗？", "Yes, if you bought them this week and have the receipt.", "可以，如果是本周买的并有收据。", "退款需要带什么？", "收据", "护照", "车票")],
    grammar: [a2q("I'd like to ___ this shirt.", "exchange", "exchanged", "exchanging", "would like to 后接动词原形。"), a2q("These shoes are too small ___ me.", "for", "to", "at", "too small for me 表示对我太小。"), a2q("I'd like ___ return this lamp.", "to", "for", "at", "would like to 后接动词原形。")],
    reading: { en: "Amy bought a jacket on Monday, but it was too large. She returned to the shop on Wednesday with her receipt. The assistant found a smaller jacket in the same color. Amy exchanged it and was pleased with the new size.", zh: "艾米周一买了件夹克，但太大了。周三她带着收据回到商店。店员找到一件同色的小号夹克。艾米换了货，对新尺码很满意。",
      questions: [a2q("夹克有什么问题？", "太大", "坏了", "颜色不对"), a2q("艾米周几回店？", "周三", "周一", "周五"), a2q("她最后换到了什么？", "同色的小号夹克", "一双鞋", "另一件大号夹克")] },
    output: { prompt: "写两句英文：说明商品的问题，并提出退货或换货请求。", sample: "This shirt is too small for me. I'd like to exchange it, please." }
  },
  {
    chapter: 2, title: "描述症状", goal: "向医生说明简单症状和持续时间。",
    words: [["fever", "发烧"], ["cough", "咳嗽"], ["stomachache", "胃痛"], ["since", "自从"], ["medicine", "药"], ["rest", "休息"]],
    rule: "描述持续时间可说 I've had a cough since Monday 或 for two days。",
    examples: [["I've had a cough for two days.", "我咳嗽两天了。"], ["I have a fever and feel tired.", "我发烧了，觉得累。"]],
    clips: [a2clip("How long have you had the cough?", "你咳嗽多久了？", "For three days, since Monday.", "三天了，从周一开始。", "咳嗽持续了多久？", "三天", "一天", "一周"),
      a2clip("What seems to be the problem?", "你哪里不舒服？", "I have a stomachache after meals.", "饭后我胃痛。", "第二个人什么时候胃痛？", "饭后", "睡前", "早上"),
      a2clip("Do you have a fever?", "你发烧吗？", "Yes, and I feel tired. I need to rest.", "发烧，而且我觉得累，需要休息。", "第二个人还觉得怎样？", "很累", "很饿", "很兴奋")],
    grammar: [a2q("I've had a cough ___ two days.", "for", "since", "at", "一段时长前用 for。"), a2q("I've felt sick ___ Monday.", "since", "for", "in", "具体起点 Monday 前用 since。"), a2q("She ___ a fever now.", "has", "have", "had", "说现在的症状，she 后用 has。")],
    reading: { en: "Ben visited a doctor on Thursday. His cough started on Monday, and he felt tired. The doctor asked him about his fever and told him to drink water and rest. Ben went home and called work to say he was sick.", zh: "本周四去看医生。他从周一开始咳嗽，也觉得累。医生问了他发烧的情况，告诉他喝水休息。本回家后给单位打电话说自己病了。",
      questions: [a2q("本从哪天开始咳嗽？", "周一", "周四", "周六"), a2q("医生建议他做什么？", "喝水休息", "去跑步", "吃辣食"), a2q("本回家后给谁打电话？", "单位", "餐厅", "酒店")] },
    output: { prompt: "用英文向医生说明一种症状和持续时间。", sample: "I've had a cough for two days, and I feel tired." }
  },
  {
    chapter: 2, title: "电话留言", goal: "打电话找人、留下姓名和回电信息。",
    words: [["call", "打电话"], ["message", "留言"], ["available", "在；有空"], ["later", "稍后"], ["number", "号码"], ["call back", "回电"]],
    rule: "电话里可以说 Could you take a message?；请对方回电说 Please ask her to call me back。",
    examples: [["Could you take a message?", "你能帮我留个言吗？"], ["Please call me back later.", "请稍后给我回电话。"]],
    clips: [a2clip("Is Mia available now?", "米娅现在在吗？", "Sorry, she's out. Can I take a message?", "抱歉，她出去了。我能帮你留言吗？", "米娅现在在哪里？", "出去了", "在家", "在电话旁"),
      a2clip("Could you ask Ben to call me back?", "你能请本给我回电吗？", "Of course. What's your number?", "当然。你的号码是多少？", "第二个人想知道什么？", "电话号码", "地址", "时间"),
      a2clip("This is Anna. I'm calling about tomorrow's meeting.", "我是安娜，打电话是为了明天的会议。", "I'll tell the manager and ask her to call you later.", "我会告诉经理，请她稍后给你回电。", "安娜为什么打电话？", "询问明天的会议", "预订房间", "退货")],
    grammar: [a2q("Could you ___ a message?", "take", "takes", "took", "Could you 后接动词原形。"), a2q("Please ask her to call me ___.", "back", "up", "over", "call back 表示回电。"), a2q("She isn't available ___.", "now", "ago", "yesterday", "说现在不在用 now。")],
    reading: { en: "Lina called her friend Eva on Friday afternoon. Eva was not at home, so her brother took a message. Lina said the picnic would start at ten on Saturday and asked Eva to call back before dinner. Eva called at six.", zh: "周五下午莉娜给朋友伊娃打电话。伊娃不在家，哥哥帮忙留言。莉娜说野餐周六十点开始，请伊娃晚饭前回电。伊娃六点打了电话。",
      questions: [a2q("谁帮伊娃接了电话？", "哥哥", "妈妈", "邻居"), a2q("野餐什么时候开始？", "周六十点", "周五六点", "周日上午八点"), a2q("伊娃几点回电？", "六点", "十点", "八点")] },
    output: { prompt: "写一段简短电话留言：说出姓名、来电原因和希望回电的时间。", sample: "This is Lina. I'm calling about our meeting. Please call me back this evening." }
  },
  {
    chapter: 3, title: "比较人和物", goal: "比较两个人或两件物品的特点。",
    words: [["taller", "更高的"], ["cheaper", "更便宜的"], ["faster", "更快的"], ["better", "更好的"], ["than", "比"], ["compare", "比较"]],
    rule: "比较两者用比较级 + than；good 的比较级是 better。",
    examples: [["This bag is cheaper than that one.", "这个包比那个便宜。"], ["The train is faster than the bus.", "火车比公交快。"]],
    clips: [a2clip("Which bag is cheaper?", "哪个包更便宜？", "The blue one is cheaper than the red one.", "蓝色的比红色的便宜。", "哪个包更便宜？", "蓝色的", "红色的", "一样便宜"),
      a2clip("Is the train faster than the bus?", "火车比公交快吗？", "Yes, but the bus is cheaper.", "是的，但公交更便宜。", "哪种交通方式更便宜？", "公交", "火车", "出租车"),
      a2clip("Is your brother taller than you?", "你兄弟比你高吗？", "No, I'm a little taller than him.", "不，我比他高一点。", "谁更高？", "第二个人", "兄弟", "一样高")],
    grammar: [a2q("This bag is cheaper ___ that one.", "than", "then", "as", "比较两者用 than。"), a2q("The train is ___ than the bus.", "faster", "fast", "fastest", "两者比较用 faster。"), a2q("This book is ___ than the old one.", "better", "good", "best", "good 的比较级是 better。")],
    reading: { en: "Two shops sell the same kind of jacket. The first shop is closer to Mei's home, but its jacket costs fifty dollars. The second shop is farther away, but its jacket is cheaper at forty dollars. Mei chooses the cheaper one.", zh: "两家商店卖同一种夹克。第一家离梅家更近，但夹克要五十美元。第二家更远，却只要四十美元。梅选择了更便宜的那件。",
      questions: [a2q("哪家商店离梅家更近？", "第一家", "第二家", "一样近"), a2q("第二家夹克多少钱？", "四十美元", "五十美元", "三十美元"), a2q("梅买了哪一家的夹克？", "第二家", "第一家", "两家都买了")] },
    output: { prompt: "比较两种交通工具或两件物品，写两句英文。", sample: "The train is faster than the bus, but the bus is cheaper." }
  },
  {
    chapter: 3, title: "最高级与选择", goal: "从三个或更多选项里说明最喜欢或最合适的一个。",
    words: [["best", "最好的"], ["cheapest", "最便宜的"], ["largest", "最大的"], ["smallest", "最小的"], ["favorite", "最喜欢的"], ["choice", "选择"]],
    rule: "在三个以上的选项中用 the + 最高级；good 的最高级是 best。",
    examples: [["This is the cheapest room.", "这是最便宜的房间。"], ["Friday is the best day for me.", "周五最适合我。"]],
    clips: [a2clip("Which room is the cheapest?", "哪间房最便宜？", "Room A is the cheapest of the three.", "三间里 A 房最便宜。", "哪间房最便宜？", "A 房", "B 房", "C 房"),
      a2clip("What is your favorite day for a trip?", "你最想哪天旅行？", "Sunday is the best day for me.", "周日最适合我。", "第二个人选哪天？", "周日", "周六", "周五"),
      a2clip("Which bag is the largest?", "哪个包最大？", "The green bag is the largest one here.", "这里绿色的包最大。", "哪个包最大？", "绿色的", "蓝色的", "红色的")],
    grammar: [a2q("This is ___ cheapest room.", "the", "a", "an", "最高级前常用 the。"), a2q("Friday is the ___ day for me.", "best", "better", "good", "good 的最高级是 best。"), a2q("Which bag is the ___?", "largest", "larger", "large", "在多件包中比较用最高级。")],
    reading: { en: "Ben looked at three hotels. The first was the closest to the station, but it was expensive. The second had the largest room. The third was the cheapest and included breakfast. Ben chose the third because he wanted to save money.", zh: "本看了三家酒店。第一家离车站最近，但价格贵。第二家房间最大。第三家最便宜，而且含早餐。本想省钱，所以选了第三家。",
      questions: [a2q("哪家酒店离车站最近？", "第一家", "第二家", "第三家"), a2q("哪家酒店房间最大？", "第二家", "第一家", "第三家"), a2q("本为什么选第三家？", "想省钱", "房间最大", "离车站最近")] },
    output: { prompt: "从三个选项中选一个最合适的，用最高级说明理由。", sample: "Friday is the best day for our trip because everyone is free." }
  },
  {
    chapter: 3, title: "工作与职责", goal: "介绍职业、工作地点和日常职责。",
    words: [["job", "工作"], ["office", "办公室"], ["customer", "顾客"], ["serve", "服务"], ["manage", "管理"], ["schedule", "日程"]],
    rule: "用一般现在时介绍经常做的工作；he/she 后动词通常加 s。",
    examples: [["She works in an office.", "她在办公室工作。"], ["He helps customers every day.", "他每天帮助顾客。"]],
    clips: [a2clip("What does your sister do?", "你姐姐做什么工作？", "She's a nurse. She works at a hospital.", "她是护士，在医院工作。", "姐姐在哪里工作？", "医院", "学校", "商店"),
      a2clip("What do you do at the shop?", "你在商店做什么？", "I help customers choose clothes.", "我帮顾客挑选衣服。", "第二个人的工作是什么？", "帮顾客选衣服", "管理火车", "做早餐"),
      a2clip("Does Ben manage the schedule?", "本负责管理日程吗？", "Yes, he plans our meetings each week.", "是的，他每周安排我们的会议。", "本每周安排什么？", "会议", "旅行", "晚餐")],
    grammar: [a2q("She ___ at a hospital.", "works", "work", "working", "she 后一般现在时动词加 s。"), a2q("He ___ customers every day.", "helps", "help", "helping", "he 后一般现在时动词加 s。"), a2q("What ___ your sister do?", "does", "do", "is", "询问 she 的职业用 does。")],
    reading: { en: "Lina works at a small hotel. She welcomes guests, answers questions, and helps with room bookings. Her brother works at a bookshop and helps customers find books. They have different jobs, but both enjoy meeting new people.", zh: "莉娜在一家小酒店工作，迎接客人、回答问题并协助订房。她的兄弟在书店工作，帮助顾客找书。他们工作不同，但都喜欢认识新朋友。",
      questions: [a2q("莉娜在哪里工作？", "酒店", "书店", "医院"), a2q("她的兄弟帮助顾客找什么？", "书", "房间", "衣服"), a2q("他们都喜欢什么？", "认识新朋友", "坐火车", "做饭")] },
    output: { prompt: "用两三句英文介绍一份工作及其职责；可以使用想象的人物。", sample: "My friend works in a shop. She helps customers choose clothes every day." }
  },
  {
    chapter: 3, title: "兴趣与变化", goal: "对比以前和现在的兴趣或习惯。",
    words: [["before", "以前"], ["now", "现在"], ["started", "开始了"], ["stopped", "停止了"], ["still", "仍然"], ["recently", "最近"]],
    rule: "对比过去和现在可用 Before, I ...；Now, I ...，注意动词时态。",
    examples: [["I played football before, but now I swim.", "我以前踢足球，现在游泳。"], ["She started reading recently.", "她最近开始阅读。"]],
    clips: [a2clip("Do you still play football?", "你还踢足球吗？", "No, I stopped last year. Now I swim.", "不了，我去年停了。现在游泳。", "第二个人现在做什么运动？", "游泳", "踢足球", "跑步"),
      a2clip("When did you start reading English books?", "你什么时候开始读英文书？", "I started two months ago, and I still read every day.", "我两个月前开始，现在仍每天读。", "第二个人何时开始读英文书？", "两个月前", "昨天", "一年前"),
      a2clip("Did you like cooking before?", "你以前喜欢做饭吗？", "Not really, but now I cook every weekend.", "不太喜欢，但现在每周末做饭。", "第二个人现在多久做一次饭？", "每周末", "每天", "每个月")],
    grammar: [a2q("I ___ football before, but now I swim.", "played", "play", "playing", "before 指过去习惯，用 played。"), a2q("Now she ___ every day.", "reads", "read", "reading", "now 表示现在的习惯，she 后用 reads。"), a2q("He ___ swimming last year.", "started", "start", "starts", "last year 提示用过去式。")],
    reading: { en: "Eva loved computer games when she was younger. Last year, she started learning the guitar. Now she practices for twenty minutes every evening and plays games only on weekends. She still likes games, but music has become her favorite activity.", zh: "伊娃小时候很爱电脑游戏。去年她开始学吉他。现在每晚练习二十分钟，只在周末玩游戏。她仍喜欢游戏，但音乐已成为最喜欢的活动。",
      questions: [a2q("伊娃去年开始学什么？", "吉他", "游泳", "绘画"), a2q("她现在每晚练习多久？", "二十分钟", "十分钟", "一小时"), a2q("她现在什么时候玩游戏？", "周末", "每天晚上", "从不")] },
    output: { prompt: "用英文对比你以前和现在的一项兴趣或习惯。", sample: "I watched TV every evening before. Now I read English books after dinner." }
  },
  {
    chapter: 4, title: "交通换乘", goal: "询问换乘路线和所需时间。",
    words: [["transfer", "换乘"], ["line", "线路"], ["platform", "站台"], ["change", "换"], ["minutes", "分钟"], ["direct", "直达的"]],
    rule: "询问换乘可说 Where do I change trains?；时间说 It takes about ... minutes。",
    examples: [["Change to Line Two at Central Station.", "在中央站换乘二号线。"], ["It takes about twenty minutes.", "大约需要二十分钟。"]],
    clips: [a2clip("How do I get to the museum by train?", "我怎么坐火车去博物馆？", "Take Line One and change to Line Two at Central Station.", "坐一号线，在中央站换乘二号线。", "应该在哪站换乘？", "中央站", "博物馆站", "机场站"),
      a2clip("Is there a direct bus to the airport?", "有直达机场的公交吗？", "No, you need to change buses at the library.", "没有，你得在图书馆换车。", "应该在哪里换车？", "图书馆", "酒店", "学校"),
      a2clip("How long does the journey take?", "这段路要多久？", "About twenty minutes if the train is on time.", "火车准点的话大约二十分钟。", "火车准点时大约要多久？", "二十分钟", "十分钟", "四十分钟")],
    grammar: [a2q("Where do I ___ trains?", "change", "changed", "changing", "do 后接动词原形。"), a2q("It ___ about twenty minutes.", "takes", "take", "taking", "it 后一般现在时用 takes。"), a2q("Change ___ Line Two.", "to", "at", "for", "换乘某线路说 change to。")],
    reading: { en: "To reach the city museum, Mei took the green train from her hotel. At Central Station, she changed to the blue line. The second train took fifteen minutes. She got off at Museum Station and walked for five minutes to the entrance.", zh: "梅从酒店坐绿色线路去城市博物馆。在中央站，她换乘蓝色线路。第二段火车坐了十五分钟。她在博物馆站下车，再走五分钟到入口。",
      questions: [a2q("梅在哪里换乘？", "中央站", "博物馆站", "酒店"), a2q("第二段火车坐了多久？", "十五分钟", "五分钟", "二十分钟"), a2q("下车后她走了多久？", "五分钟", "十五分钟", "十分钟")] },
    output: { prompt: "用英文说明从一个地点到另一个地点的换乘方法。", sample: "Take Line One to Central Station. Change to Line Two there." }
  },
  {
    chapter: 4, title: "住宿问题", goal: "向酒店说明房间问题并请求解决。",
    words: [["noisy", "吵闹的"], ["quiet", "安静的"], ["air conditioner", "空调"], ["towel", "毛巾"], ["problem", "问题"], ["move", "换到"]],
    rule: "礼貌地报告问题可说 There's a problem with ...；请求更换可说 Could I move to another room?",
    examples: [["There's a problem with the air conditioner.", "空调有问题。"], ["Could I have a quieter room?", "可以给我一间更安静的房间吗？"]],
    clips: [a2clip("Is everything okay with your room?", "房间一切都好吗？", "The air conditioner isn't working. Could someone check it?", "空调坏了。可以请人检查一下吗？", "房间里什么坏了？", "空调", "电视", "门锁"),
      a2clip("Why would you like another room?", "您为什么想换房间？", "This room is very noisy at night.", "这间房晚上很吵。", "客人为什么想换房？", "晚上太吵", "房间太小", "没有早餐"),
      a2clip("Do you need anything else?", "您还需要什么吗？", "Yes, could you bring two clean towels?", "需要，能送两条干净毛巾吗？", "客人要几条毛巾？", "两条", "一条", "三条")],
    grammar: [a2q("There's a problem ___ the air conditioner.", "with", "for", "to", "某物有问题说 a problem with。"), a2q("Could I have a ___ room?", "quieter", "quiet", "quietest", "想换更安静的房间用比较级。"), a2q("The air conditioner ___ working.", "isn't", "aren't", "don't", "单数主语后用 isn't。")],
    reading: { en: "At the hotel, Ben found that his room was next to a busy road. He could not sleep because it was noisy. In the morning, he spoke to the receptionist. She offered him a quieter room on another floor and helped move his luggage.", zh: "在酒店，本发现房间靠着繁忙的道路。因为太吵，他睡不着。早上他告诉前台。前台给他换了另一层更安静的房间，还帮忙搬行李。",
      questions: [a2q("本为什么睡不着？", "路边太吵", "空调太冷", "房间没灯"), a2q("他什么时候找前台？", "早上", "午夜", "下午"), a2q("前台提供了什么？", "另一层更安静的房间", "一张车票", "免费晚餐")] },
    output: { prompt: "用两句英文向酒店说明一个房间问题并请求帮助。", sample: "There's a problem with the air conditioner. Could someone check it, please?" }
  },
  {
    chapter: 4, title: "行程安排", goal: "按时间顺序说明一天的旅行计划。",
    words: [["first", "首先"], ["then", "然后"], ["after that", "之后"], ["finally", "最后"], ["visit", "参观"], ["leave", "离开"]],
    rule: "用 first、then、after that、finally 连接步骤，让行程清楚。",
    examples: [["First, we'll visit the museum.", "首先我们参观博物馆。"], ["Then we'll have lunch near the park.", "然后在公园附近吃午饭。"]],
    clips: [a2clip("What are we doing first?", "我们先做什么？", "First, we'll visit the museum. Then we'll have lunch.", "先参观博物馆，然后吃午饭。", "他们先做什么？", "参观博物馆", "吃午饭", "回酒店"),
      a2clip("When will we leave the park?", "我们什么时候离开公园？", "At four. After that, we'll go back to the hotel.", "四点。之后我们回酒店。", "他们几点离开公园？", "四点", "两点", "六点"),
      a2clip("What's the last stop today?", "今天最后一站是哪里？", "Finally, we'll visit the old market before dinner.", "最后我们晚饭前去老市场。", "最后一站在哪里？", "老市场", "博物馆", "火车站")],
    grammar: [a2q("___, we'll visit the museum.", "First", "Finally", "Yesterday", "介绍第一步用 First。"), a2q("We'll eat lunch. ___ that, we'll go to the park.", "After", "Before", "From", "After that 表示此后。"), a2q("___, we'll return to the hotel.", "Finally", "First", "Before", "介绍最后一步用 Finally。")],
    reading: { en: "Amy planned a day in the city for her friends. First, they would visit the art museum at ten. Then they would have lunch near the river. After lunch, they would walk through the old market. Finally, they would return to the hotel at five.", zh: "艾米为朋友们安排了一天的城市行程。先十点参观美术馆，再到河边吃午饭。午饭后逛老市场，最后五点回酒店。",
      questions: [a2q("他们几点参观美术馆？", "十点", "五点", "十二点"), a2q("他们在哪里吃午饭？", "河边", "酒店里", "车站旁"), a2q("他们什么时候回酒店？", "五点", "十点", "中午")] },
    output: { prompt: "用 first、then、finally 写出三步的周末行程。", sample: "First, we'll visit the museum. Then we'll eat lunch. Finally, we'll walk in the park." }
  },
  {
    chapter: 4, title: "景点与建议", goal: "向游客推荐地点并说明理由。",
    words: [["recommend", "推荐"], ["popular", "受欢迎的"], ["historic", "历史悠久的"], ["view", "景色"], ["ticket", "门票"], ["worth", "值得"]],
    rule: "推荐地点可说 You should visit ... because ...；说值得一看可用 It's worth visiting。",
    examples: [["You should visit the old town.", "你应该去老城区。"], ["It's worth visiting because the view is beautiful.", "值得去，因为景色很美。"]],
    clips: [a2clip("What should I see in this city?", "这座城市我该看什么？", "You should visit the old town. It's full of historic buildings.", "你应该去老城区，那里有许多老建筑。", "推荐的地点是哪里？", "老城区", "新车站", "机场"),
      a2clip("Is the hill worth visiting?", "那座山值得去吗？", "Yes. The view from the top is beautiful.", "值得。山顶景色很美。", "为什么值得去？", "山顶景色美", "门票免费", "离酒店近"),
      a2clip("Do I need a ticket for the museum?", "去博物馆要门票吗？", "Yes, but tickets are cheaper on Tuesday.", "要，但周二门票更便宜。", "哪天门票更便宜？", "周二", "周一", "周日")],
    grammar: [a2q("You ___ visit the old town.", "should", "did", "was", "提出建议可用 should。"), a2q("It's worth ___.", "visiting", "visit", "visited", "worth 后常接动词 -ing。"), a2q("I recommend the museum ___ it's interesting.", "because", "but", "or", "说明推荐理由用 because。")],
    reading: { en: "A local guide recommended the old town to Ben. The streets were narrow, but the buildings were beautiful. Ben visited on Tuesday because tickets for the small museum were cheaper then. He enjoyed the view from a nearby hill after lunch.", zh: "当地导游向本推荐老城区。街道窄，但建筑很美。本周二去，因为那天小博物馆门票更便宜。午饭后他还欣赏了附近山上的景色。",
      questions: [a2q("导游推荐哪里？", "老城区", "新机场", "海滩"), a2q("本为什么周二去？", "博物馆门票更便宜", "朋友有空", "天气最好"), a2q("他午饭后去了哪里？", "附近的山", "车站", "酒店")] },
    output: { prompt: "推荐一个熟悉的地点，并用 because 说出原因。", sample: "You should visit the old town because the buildings are beautiful." }
  },
  {
    chapter: 5, title: "表达观点", goal: "对熟悉的话题说出自己的看法。",
    words: [["opinion", "观点"], ["think", "认为"], ["believe", "相信"], ["useful", "有用的"], ["important", "重要的"], ["prefer", "更喜欢"]],
    rule: "表达看法可以说 I think ...；表达偏好用 I prefer A to B。",
    examples: [["I think reading is useful.", "我认为阅读有用。"], ["I prefer tea to coffee.", "比起咖啡，我更喜欢茶。"]],
    clips: [a2clip("What do you think about English podcasts?", "你怎么看英语播客？", "I think they're useful because I can listen on the bus.", "我觉得有用，因为我能在公交上听。", "第二个人为什么觉得播客有用？", "坐公交时能听", "不用网络", "完全免费"),
      a2clip("Do you prefer tea or coffee?", "你更喜欢茶还是咖啡？", "I prefer tea. Coffee keeps me awake at night.", "我更喜欢茶。咖啡让我晚上睡不着。", "第二个人更喜欢什么？", "茶", "咖啡", "果汁"),
      a2clip("Is daily practice important?", "每天练习重要吗？", "Yes, I believe a little practice every day helps.", "重要。我相信每天练一点有帮助。", "第二个人对每日练习怎么看？", "有帮助", "没有必要", "太难")],
    grammar: [a2q("I ___ reading is useful.", "think", "thinks", "thinking", "I 后用 think。"), a2q("I prefer tea ___ coffee.", "to", "than", "for", "prefer A to B 表示更喜欢 A。"), a2q("She ___ daily practice helps.", "believes", "believe", "believing", "she 后一般现在时用 believes。")],
    reading: { en: "Mei thinks short daily practice is better than studying for hours once a week. She listens to English on the bus and reads before bed. Her friend prefers longer lessons on weekends. They have different methods, but both want to improve.", zh: "梅认为每天短时间练习比一周一次学几个小时更好。她在公交上听英语，睡前阅读。朋友则喜欢周末上较长的课。他们方法不同，但都想进步。",
      questions: [a2q("梅认为哪种方法更好？", "每天短时间练习", "一周只学一次", "完全不练听力"), a2q("梅睡前做什么？", "阅读", "看电影", "跑步"), a2q("她朋友更喜欢什么时候上长课？", "周末", "每天早晨", "每天晚上")] },
    output: { prompt: "选择一个熟悉话题，用 I think 或 I prefer 表达观点。", sample: "I think daily practice is useful. I prefer short lessons to long ones." }
  },
  {
    chapter: 5, title: "解释原因", goal: "用简单连接词说明原因和结果。",
    words: [["because", "因为"], ["so", "所以"], ["reason", "原因"], ["result", "结果"], ["late", "迟到的"], ["missed", "错过了"]],
    rule: "because 引出原因；so 引出结果，通常不要在同一句中同时写 because 和 so。",
    examples: [["I stayed home because it rained.", "因为下雨，我待在家。"], ["It rained, so I stayed home.", "下雨了，所以我待在家。"]],
    clips: [a2clip("Why were you late?", "你为什么迟到？", "I missed the bus, so I walked here.", "我错过了公交，所以走路来的。", "第二个人为什么迟到？", "错过了公交", "下雨了", "忘了时间"),
      a2clip("Why did you stay home?", "你为什么待在家？", "Because I had a fever yesterday.", "因为我昨天发烧了。", "第二个人为什么待在家？", "发烧了", "没有车票", "天气太热"),
      a2clip("The train was late this morning.", "今天早上火车晚点了。", "So we arrived after the meeting started.", "所以我们在会议开始后才到。", "他们什么时候到达？", "会议开始后", "会议开始前", "中午前")],
    grammar: [a2q("I stayed home ___ it rained.", "because", "so", "but", "because 后面说明原因。"), a2q("It rained, ___ we stayed home.", "so", "because", "or", "so 后面说明结果。"), a2q("I was late ___ I missed the bus.", "because", "so", "and", "错过公交是迟到的原因。")],
    reading: { en: "Amy left home late because she could not find her keys. She missed the first bus, so she took the next one. She called her teacher to explain the delay. The teacher understood because Amy usually arrived on time.", zh: "艾米因为找不到钥匙而出门晚了。她错过第一班公交，便坐下一班。她给老师打电话解释迟到。老师理解，因为艾米平时总是准时。",
      questions: [a2q("艾米为什么出门晚？", "找不到钥匙", "下雨", "睡过头"), a2q("她错过第一班车后怎么办？", "坐下一班", "步行", "坐火车"), a2q("老师为什么理解她？", "她平时准时", "老师也迟到", "当天不上课")] },
    output: { prompt: "写一句说明原因的话，再写一句说明结果的话。", sample: "I missed the bus because I left home late. I took a taxi, so I arrived on time." }
  },
  {
    chapter: 5, title: "提出建议", goal: "给朋友一条简单而礼貌的建议。",
    words: [["should", "应该"], ["could", "可以"], ["try", "尝试"], ["advice", "建议"], ["problem", "问题"], ["solution", "解决办法"]],
    rule: "建议用 should/could + 动词原形；could 语气更委婉。",
    examples: [["You should rest today.", "你今天应该休息。"], ["You could ask the teacher.", "你可以问老师。"]],
    clips: [a2clip("I can't understand this grammar rule.", "我不理解这个语法规则。", "You could ask the teacher for an example.", "你可以请老师举个例子。", "第二个人建议做什么？", "请老师举例", "停止学习", "换本书"),
      a2clip("I feel tired after work.", "我下班后很累。", "You should rest before you study English.", "你学英语前应该先休息。", "第二个人建议先做什么？", "休息", "跑步", "做饭"),
      a2clip("I keep forgetting new words.", "我总忘新单词。", "You could review them for five minutes each day.", "你可以每天复习五分钟。", "建议每天复习多久？", "五分钟", "半小时", "一小时")],
    grammar: [a2q("You should ___ today.", "rest", "rests", "rested", "should 后接动词原形。"), a2q("She could ___ the teacher.", "ask", "asks", "asked", "could 后接动词原形。"), a2q("You ___ try again tomorrow.", "could", "did", "was", "委婉建议可用 could。")],
    reading: { en: "Ben wanted to improve his speaking, but he was afraid of mistakes. His friend suggested short conversations every day. She said he could record one sentence, listen to it, and try again. Ben followed the advice and felt more confident after a month.", zh: "本想提高口语，但怕出错。朋友建议每天进行短对话。她说他可以录一句话，听一遍，再试一次。本照做了，一个月后更有信心。",
      questions: [a2q("本担心什么？", "说错", "迟到", "迷路"), a2q("朋友建议他每天做什么？", "短对话", "长考试", "看电影"), a2q("一个月后本感觉怎样？", "更有信心", "更害怕", "更疲惫")] },
    output: { prompt: "朋友说自己记不住单词，请给出一条英文建议并解释。", sample: "You could review five words each day because short practice is easier." }
  },
  {
    chapter: 5, title: "同意与不同意", goal: "礼貌地回应观点，并补充自己的理由。",
    words: [["agree", "同意"], ["disagree", "不同意"], ["however", "不过"], ["also", "也"], ["different", "不同的"], ["point", "观点"]],
    rule: "同意说 I agree.；不同意可说 I see your point, but ...，语气更礼貌。",
    examples: [["I agree. Walking is healthy.", "我同意。步行有益健康。"], ["I see your point, but the train is faster.", "我理解你的观点，但火车更快。"]],
    clips: [a2clip("I think the bus is the best choice.", "我觉得公交是最好的选择。", "I see your point, but the train is faster.", "我理解，不过火车更快。", "第二个人更看重什么？", "速度", "价格", "座位"),
      a2clip("Daily reading helps me learn English.", "每天阅读帮助我学英语。", "I agree. It helps me remember words too.", "我同意。它也帮助我记单词。", "第二个人同意吗？", "同意", "不同意", "没有回应"),
      a2clip("I prefer studying alone.", "我更喜欢独自学习。", "That's fine. I learn better with friends, however.", "没关系。不过我和朋友一起学效果更好。", "第二个人更喜欢怎样学习？", "和朋友一起", "独自一人", "只听录音")],
    grammar: [a2q("I ___ with you.", "agree", "agrees", "agreeing", "I 后用 agree。"), a2q("I see your point, ___ the train is faster.", "but", "because", "so", "but 用于提出不同看法。"), a2q("I learn better with friends, ___.", "however", "because", "before", "句末 however 可表示转折。")],
    reading: { en: "Lina and Mei discussed how to travel to the beach. Lina preferred the bus because it was cheaper. Mei agreed about the price, but she thought the train was faster and more comfortable. They checked the times and chose the train for this trip.", zh: "莉娜和梅讨论如何去海滩。莉娜偏好公交，因为更便宜。梅同意价格这一点，但认为火车更快、更舒适。他们查看时间后，这次选择了火车。",
      questions: [a2q("莉娜为什么偏好公交？", "更便宜", "更快", "更舒适"), a2q("梅认为火车有什么优点？", "更快且更舒适", "更便宜", "不用车票"), a2q("他们最终选了什么？", "火车", "公交", "出租车")] },
    output: { prompt: "先表示同意或理解，再用一句话补充你的不同看法。", sample: "I see your point, but I think the train is faster." }
  },
  {
    chapter: 6, title: "邮件邀请", goal: "写一封简短邀请邮件，说明时间、地点与回复方式。",
    words: [["email", "邮件"], ["subject", "主题"], ["invite", "邀请"], ["event", "活动"], ["reply", "回复"], ["looking forward", "期待"]],
    rule: "邮件邀请要写清活动、时间、地点；结尾可用 Please let me know if you can come。",
    examples: [["I'd like to invite you to dinner on Friday.", "我想邀请你周五吃晚饭。"], ["Please let me know if you can come.", "请告诉我你能否来。"]],
    clips: [a2clip("Did you get my invitation email?", "你收到我的邀请邮件了吗？", "Yes. I'll come to dinner on Friday at seven.", "收到了。周五七点的晚餐我会来。", "晚餐是几点？", "七点", "六点", "八点"),
      a2clip("Where is the event?", "活动在哪里？", "At the new cafe next to the library.", "在图书馆旁边的新咖啡馆。", "活动在哪里？", "新咖啡馆", "图书馆内", "公园里"),
      a2clip("Please reply to my email by Wednesday.", "请周三前回复我的邮件。", "Of course. I'll let you know tonight.", "好的，我今晚告诉你。", "第二个人什么时候会回复？", "今晚", "周三晚上", "下周")],
    grammar: [a2q("I'd like to invite you ___ dinner.", "to", "for", "at", "invite someone to dinner 是常见搭配。"), a2q("Please let me know if you ___ free on Friday.", "are", "is", "am", "you 后用 are。"), a2q("I'm looking forward to ___ you.", "seeing", "see", "saw", "look forward to 后接动词 -ing。")],
    reading: { en: "Mei sent an email to Ben inviting him to a small dinner on Friday at seven. The dinner would be at her home near the station. She asked Ben to reply by Wednesday so she could prepare enough food. Ben wrote back that evening and accepted.", zh: "梅给本发邮件，邀请他周五七点来参加小型晚餐。晚餐在她靠近车站的家里。她请本周三前回复，以便准备足够食物。本当晚回信接受了邀请。",
      questions: [a2q("晚餐在哪里举行？", "梅家", "餐厅", "车站"), a2q("梅希望本何时前回复？", "周三", "周五", "周日"), a2q("本什么时候回信？", "当天晚上", "周五早上", "下周")] },
    output: { prompt: "写一封 3—4 句的英文邀请：说明活动、时间、地点，并请对方回复。", sample: "Hi Ben, I'd like to invite you to dinner on Friday at seven. We'll meet at my home. Please let me know if you can come." }
  },
  {
    chapter: 6, title: "讲述一次经历", goal: "按顺序讲述一次过去的经历及感受。",
    words: [["experience", "经历"], ["arrived", "到达了"], ["met", "遇见了"], ["tried", "尝试了"], ["afterwards", "随后"], ["felt", "感到"]],
    rule: "讲过去经历时用过去式，并用 first、then、afterwards 串联事件。",
    examples: [["First, we arrived at the station.", "首先我们到了车站。"], ["Afterwards, we tried a new restaurant.", "随后我们尝试了一家新餐厅。"]],
    clips: [a2clip("What happened on your trip?", "你的旅行发生了什么？", "First, we missed the bus. Then we took a train.", "先错过了公交，然后坐了火车。", "他们错过公交后乘了什么？", "火车", "出租车", "轮船"),
      a2clip("Did you meet anyone at the museum?", "你在博物馆遇见人了吗？", "Yes, I met an old friend there.", "遇见了一个老朋友。", "第二个人遇见了谁？", "老朋友", "老师", "导游"),
      a2clip("How did you feel after the concert?", "音乐会后你感觉怎样？", "I felt tired but happy.", "我累了，但很开心。", "第二个人感觉怎样？", "累但开心", "生气", "无聊")],
    grammar: [a2q("We ___ at the station at ten.", "arrived", "arrive", "arriving", "讲过去的到达用 arrived。"), a2q("I ___ an old friend there.", "met", "meet", "meeted", "meet 的过去式是 met。"), a2q("Afterwards, I ___ tired but happy.", "felt", "feel", "feeled", "feel 的过去式是 felt。")],
    reading: { en: "Last month, Lina travelled to a small coastal town. First, she arrived by train and met her cousin. Then they tried local food at a market. Afterwards, they walked by the sea and took photos. Lina felt tired but wanted to return someday.", zh: "上个月莉娜去了海边小镇。她先坐火车到达，见了表亲；然后在市场尝试当地食物；之后沿海散步拍照。她累了，但希望有一天再来。",
      questions: [a2q("莉娜怎样到小镇？", "坐火车", "乘公交", "步行"), a2q("她们在哪里尝试当地食物？", "市场", "酒店", "车站"), a2q("莉娜最后有什么想法？", "以后想再来", "不再旅行", "想立刻回家")] },
    output: { prompt: "用 first、then、afterwards 讲述一次过去的经历和感受。", sample: "First, I arrived at the beach. Then I met my friend. Afterwards, we ate lunch. I felt happy." }
  },
  {
    chapter: 6, title: "解决日常问题", goal: "清楚说明问题、请求帮助并确认解决方法。",
    words: [["lost", "丢失的"], ["found", "找到了"], ["replace", "更换"], ["contact", "联系"], ["confirm", "确认"], ["solution", "解决办法"]],
    rule: "解决问题可按‘说明情况→请求帮助→确认下一步’表达。",
    examples: [["I've lost my ticket. Could you help me?", "我的票丢了，你能帮我吗？"], ["So I should contact the desk, right?", "所以我应该联系服务台，对吗？"]],
    clips: [a2clip("I've lost my train ticket.", "我的火车票丢了。", "Please go to the information desk with your ID.", "请带证件去问讯处。", "应该去哪里求助？", "问讯处", "餐厅", "酒店"),
      a2clip("The key to my room isn't working.", "我的房卡不能用了。", "I'm sorry. I'll replace it for you now.", "抱歉，我现在给您换一张。", "工作人员会做什么？", "更换房卡", "更换房间", "退款"),
      a2clip("I can't find my phone. What should I do?", "我找不到手机，应该怎么办？", "Ask at the front desk. Someone may have found it.", "去前台问问，可能有人捡到了。", "建议先联系哪里？", "前台", "公交司机", "餐厅")],
    grammar: [a2q("I've ___ my ticket.", "lost", "lose", "losing", "现在完成时用 have + 过去分词 lost。"), a2q("Could you ___ me?", "help", "helps", "helped", "Could 后接动词原形。"), a2q("I'll ___ the key for you.", "replace", "replaced", "replacing", "will 后接动词原形。")],
    reading: { en: "Ben could not open his hotel room with his key card. He explained the problem at the front desk. The receptionist checked his room number and replaced the card. Ben tried the new card, confirmed that it worked, and thanked her for the help.", zh: "本的房卡打不开酒店房门。他到前台说明问题。前台核对房号并换了卡。本试过新卡，确认可以使用，然后向前台道谢。",
      questions: [a2q("本遇到什么问题？", "房卡打不开门", "行李丢了", "房间太吵"), a2q("前台先核对了什么？", "房号", "护照", "车票"), a2q("本怎样确认问题解决？", "试了新房卡", "给朋友打电话", "换了房间")] },
    output: { prompt: "用 3 句英文说明一个日常问题、请求帮助并确认下一步。", sample: "My room key isn't working. Could you replace it, please? Should I try it now?" }
  },
  {
    chapter: 6, title: "综合情景任务", goal: "综合运用过去经历、未来计划、建议与礼貌请求。",
    words: [["explain", "解释"], ["decide", "决定"], ["suggest", "建议"], ["arrange", "安排"], ["instead", "改为"], ["confirm", "确认"]],
    rule: "完整交流可按‘说明过去情况→提出新计划→给出理由→确认’组织。",
    examples: [["We missed the train, so we'll leave tomorrow.", "我们错过火车，所以明天出发。"], ["Could we meet at nine instead?", "我们改成九点见可以吗？"]],
    clips: [a2clip("Why didn't you come yesterday?", "你昨天为什么没来？", "I was sick, but I'm going to come tomorrow.", "我昨天病了，但明天打算来。", "第二个人为什么昨天没来？", "生病了", "错过火车", "忘记约定"),
      a2clip("We missed the train. What should we do?", "我们错过火车了，怎么办？", "We could take the bus instead. It leaves at ten.", "我们可以改坐公交，十点发车。", "建议改坐什么？", "公交", "出租车", "另一班火车"),
      a2clip("Can we confirm tomorrow's meeting?", "能确认明天的会面吗？", "Yes, let's meet at the library at nine.", "可以，九点在图书馆见。", "他们约在哪里见面？", "图书馆", "车站", "咖啡馆")],
    grammar: [a2q("We ___ the train yesterday.", "missed", "miss", "missing", "yesterday 提示用过去式。"), a2q("We could ___ the bus instead.", "take", "took", "takes", "could 后接动词原形。"), a2q("Let's meet ___ nine tomorrow.", "at", "on", "in", "具体钟点前用 at。")],
    reading: { en: "Mei and Ben planned a museum trip, but Ben was sick on Saturday. They decided to go on Sunday instead. The forecast said it would rain, so Mei suggested taking the train. They agreed to meet at the station at nine and confirmed the plan by message.", zh: "梅和本原计划去博物馆，但本周六生病了。他们决定改到周日。天气预报说会下雨，梅建议坐火车。他们约好九点在车站见，并发消息确认计划。",
      questions: [a2q("他们为什么改到周日？", "本周六生病", "博物馆关门", "没有车票"), a2q("梅建议乘什么？", "火车", "公交", "出租车"), a2q("他们在哪里见面？", "车站", "博物馆", "图书馆")] },
    output: { prompt: "写一段 4 句左右的对话：说明一次计划变化、原因、新安排，并确认时间地点。", sample: "I was sick yesterday, so I couldn't come. Could we meet tomorrow instead? Let's meet at the station at nine. See you there!" }
  },
];

const A2_UNITS = A2_SPECS.map(spec => ({ chapter: spec.chapter, title: spec.title, goal: spec.goal, words: spec.words,
  rule: spec.rule, examples: spec.examples, dialogue: spec.clips[0].dialogue, listen: spec.clips[0],
  grammar: spec.grammar[0], reading: { en: spec.reading.en, zh: spec.reading.zh, ...spec.reading.questions[0] },
  output: spec.output, review: spec.grammar[2] }));
const A2_MORE = A2_SPECS.map(spec => [spec.grammar[1], ...spec.reading.questions.slice(1)]);
const A2_LISTENING_MORE = A2_SPECS.map(spec => spec.clips.slice(1));

if (typeof module !== "undefined") module.exports = { A2_CHAPTERS, A2_UNITS, A2_MORE, A2_LISTENING_MORE };
