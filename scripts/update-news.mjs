import { mkdir, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { SOURCE_DEFINITIONS } from "./sources.mjs";

const OUTPUT_PATH = new URL("../public/news.json", import.meta.url);
const SOURCES_PATH = new URL("../public/sources.json", import.meta.url);
const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS || "140", 10);
const WINDOW_HOURS = Number.parseInt(process.env.WINDOW_HOURS || "168", 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "20000", 10);
const FETCH_RETRIES = Number.parseInt(process.env.FETCH_RETRIES || "2", 10);
const CADENCE_MINUTES = Number.parseInt(process.env.CADENCE_MINUTES || "30", 10);
const DEFAULT_SOURCE_ITEM_LIMIT = Number.parseInt(process.env.SOURCE_ITEM_LIMIT || "24", 10);

const CHINA_REACHABLE_HOSTS = [
  "36kr.com",
  "cnblogs.com",
  "ithome.com",
  "leiphone.com",
  "my.oschina.net",
  "oschina.net",
  "qbitai.com"
];

const ALLOWED_EXTERNAL_HOSTS = [
  "arxiv.org",
  "arstechnica.com",
  "azure.microsoft.com",
  "blog.google",
  "blogs.microsoft.com",
  "blogs.nvidia.com",
  "export.arxiv.org",
  "github.blog",
  "huggingface.co",
  "openai.com",
  "research.google",
  "techcrunch.com",
  "technologyreview.com",
  "the-decoder.com",
  "theverge.com"
];

const AI_KEYWORDS = [
  "ai",
  "aigc",
  "artificial intelligence",
  "openai",
  "chatgpt",
  "gpt",
  "anthropic",
  "claude",
  "gemini",
  "deepmind",
  "llm",
  "large language model",
  "generative",
  "sora",
  "copilot",
  "mistral",
  "llama",
  "xai",
  "grok",
  "agent",
  "agents",
  "machine learning",
  "foundation model",
  "transformer",
  "inference",
  "reasoning",
  "computer vision",
  "reinforcement learning",
  "neural",
  "gpu",
  "deepseek",
  "qwen",
  "kimi",
  "doubao",
  "ernie",
  "人工智能",
  "智能",
  "大模型",
  "模型",
  "生成式",
  "生成式人工智能",
  "智能体",
  "智能助手",
  "机器学习",
  "深度学习",
  "神经网络",
  "自然语言处理",
  "计算机视觉",
  "强化学习",
  "扩散模型",
  "语音识别",
  "图像生成",
  "视频生成",
  "通义",
  "千问",
  "文心",
  "豆包",
  "月之暗面",
  "深度求索",
  "算力",
  "英伟达",
  "多模态",
  "芯片",
  "机器人",
  "自动驾驶",
  "监管",
  "具身",
  "李飞飞"
];

const WEAK_AI_KEYWORDS = new Set(["智能", "模型", "芯片", "监管"]);

const TOPIC_RULES = [
  { name: "模型发布", keys: ["gpt", "claude", "gemini", "llama", "mistral", "model", "大模型", "模型发布"] },
  { name: "产品应用", keys: ["app", "product", "copilot", "chatgpt", "assistant", "agent", "应用", "智能体"] },
  { name: "算力芯片", keys: ["nvidia", "gpu", "chip", "semiconductor", "cuda", "算力", "芯片", "英伟达"] },
  { name: "监管安全", keys: ["regulation", "policy", "safety", "copyright", "law", "监管", "安全", "版权"] },
  { name: "研究论文", keys: ["research", "paper", "benchmark", "arxiv", "研究", "论文", "基准"] },
  { name: "投融资", keys: ["funding", "startup", "valuation", "invest", "ipo", "融资", "估值", "投资"] },
  { name: "多模态", keys: ["video", "image", "audio", "multimodal", "sora", "vision", "多模态", "视频", "图像", "语音"] },
  { name: "端侧智能", keys: ["device", "edge", "phone", "pc", "laptop", "端侧", "手机", "本地"] },
  { name: "开源生态", keys: ["open source", "hugging face", "github", "apache", "开源"] },
  { name: "机器人", keys: ["robot", "robotics", "humanoid", "机器人", "具身"] }
];

const RESEARCH_FOCUS_RULES = [
  { label: "大语言模型", keys: ["llm", "large language model", "language model", "gpt", "chatgpt"] },
  { label: "智能体", keys: ["agent", "agents", "multi-agent", "automated"] },
  { label: "强化学习", keys: ["reinforcement learning", "temporal-difference", "off-policy", "policy"] },
  { label: "扩散模型", keys: ["diffusion", "image generation", "video generation"] },
  { label: "多模态", keys: ["multimodal", "vision-language", "audio", "video", "image"] },
  { label: "模型安全", keys: ["safety", "alignment", "privacy", "erasure", "risk"] },
  { label: "模型评测", keys: ["benchmark", "evaluation", "review", "assessment"] },
  { label: "机器人", keys: ["robot", "robotics", "humanoid"] },
  { label: "知识工程", keys: ["ontology", "knowledge graph", "categorical", "concept"] },
  { label: "工程仿真", keys: ["finite element", "simulation", "engineering"] },
  { label: "自然语言处理", keys: ["natural language", "text", "translation", "summarization"] },
  { label: "计算机视觉", keys: ["computer vision", "object detection", "segmentation", "image"] }
];

const ROUND_LABELS = {
  A: "第一轮",
  B: "第二轮",
  C: "第三轮",
  D: "第四轮",
  E: "第五轮",
  F: "第六轮",
  G: "第七轮",
  H: "第八轮"
};

const DISPLAY_REPLACEMENTS = [
  [/\b2D\b/gi, "二维"],
  [/\b3D\b/gi, "三维"],
  [/\b88\s*VIP\b/gi, "会员"],
  [/\bVIP\b/gi, "会员"],
  [/\b3C\b/gi, "消费电子"],
  [/\bUSB\s*Type\s*-?\s*C\b/gi, "通用串行总线丙型接口"],
  [/\bType\s*-?\s*C\b/gi, "丙型接口"],
  [/\bUSB\b/gi, "通用串行总线"],
  [/\bWi\s*-?\s*Fi\b/gi, "无线网络"],
  [/\bArtificial Intelligence\b/gi, "人工智能"],
  [/\bGenerative AI\b/gi, "生成式人工智能"],
  [/\bOpen Source\b/gi, "开源"],
  [/\bMachine Learning\b/gi, "机器学习"],
  [/\bDeep Learning\b/gi, "深度学习"],
  [/\bLarge Language Model(s)?\b/gi, "大语言模型"],
  [/\bDeepSeek\b/gi, "深度求索"],
  [/\bWindows\b/gi, "视窗系统"],
  [/\bStellantis\b/gi, "斯特兰蒂斯"],
  [/\bTechCrunch\b/gi, "科技创投媒体"],
  [/\bArs Technica\b/gi, "技术深度媒体"],
  [/\bThe Decoder\b/gi, "人工智能解码媒体"],
  [/\bThe Verge\b/gi, "前沿科技媒体"],
  [/\bMIT Technology Review\b/gi, "麻省理工科技评论"],
  [/\bTechnology Review\b/gi, "科技评论"],
  [/\bQualcomm\b/gi, "高通"],
  [/\bSnapdragon\b/gi, "骁龙"],
  [/\bOPPO\b/gi, "欧珀"],
  [/\bEnco\b/gi, "声学耳机"],
  [/\bAirPods\b/gi, "苹果耳机"],
  [/\biPhone\b/gi, "苹果手机"],
  [/\biPad\b/gi, "苹果平板"],
  [/\bMac\b/gi, "苹果电脑"],
  [/\bHarmonyOS\b/gi, "鸿蒙系统"],
  [/\bAndroid\b/gi, "安卓"],
  [/\biOS\b/gi, "苹果移动系统"],
  [/\bSoC\b/gi, "系统级芯片"],
  [/\bPro\b/gi, "专业版"],
  [/\bMax\b/gi, "旗舰版"],
  [/\bMini\b/gi, "小型版"],
  [/\bOpenAI(?:'s|’s)?\b/gi, "开放人工智能公司"],
  [/\bOpenAI\b/gi, "开放人工智能公司"],
  [/\bCodex\b/gi, "智能编程工具"],
  [/\bCodeQL\b/gi, "代码分析工具"],
  [/\bGPT\s*-?\s*5\.5\b/gi, "新一代语言模型"],
  [/\bBraintrust\b/gi, "智能评测平台"],
  [/\bEndava\b/gi, "恩达瓦公司"],
  [/\bCisco\b/gi, "思科"],
  [/\bWarp(?:'s|’s)?\b/gi, "沃普开发工具"],
  [/\bMUFG\b/gi, "三菱日联金融集团"],
  [/\bGartner\b/gi, "高德纳"],
  [/\bChatGPT Enterprise\b/gi, "企业版智能聊天助手"],
  [/\bRosalind Biodefense\b/gi, "罗莎琳德生物防御"],
  [/\bGPT\s*-?\s*Rosalind\b/gi, "罗莎琳德模型"],
  [/\bGrupo Folha\b/gi, "巴西新闻集团"],
  [/\bGrupo UOL\b/gi, "巴西门户集团"],
  [/\bVirgin Atlantic\b/gi, "维珍航空"],
  [/\bAnthropic\b/gi, "人工智能安全公司"],
  [/\bOpus\b/gi, "旗舰模型"],
  [/\bsbt\b/gi, "构建工具"],
  [/\bChatGPT\b/gi, "智能聊天助手"],
  [/\bClaude\b/gi, "克劳德模型"],
  [/\bGemini\b/gi, "双子座模型"],
  [/\bDeepMind\b/gi, "深度思维"],
  [/\bGoogle\b/gi, "谷歌"],
  [/\bMicrosoft\b/gi, "微软"],
  [/\bNVIDIA\b/gi, "英伟达"],
  [/\bApple\b/gi, "苹果"],
  [/\bMeta\b/gi, "元宇宙平台公司"],
  [/\bTesla\b/gi, "特斯拉"],
  [/\bByteDance\b/gi, "字节跳动"],
  [/\bAlibaba\b/gi, "阿里巴巴"],
  [/\bBaidu\b/gi, "百度"],
  [/\bTencent\b/gi, "腾讯"],
  [/\bQwen\b/gi, "通义千问"],
  [/\bKimi\b/gi, "月之暗面"],
  [/\bDoubao\b/gi, "豆包"],
  [/\bErnie\b/gi, "文心"],
  [/\bLlama\b/gi, "开源大语言模型"],
  [/\bMistral\b/gi, "欧洲大模型"],
  [/\bCopilot\b/gi, "智能副驾"],
  [/\bImageNet\b/gi, "图像网络数据集"],
  [/\bSora\b/gi, "视频生成模型"],
  [/\bAIGC\b/gi, "生成式人工智能"],
  [/\bAI\b/gi, "人工智能"],
  [/\bAGI\b/gi, "通用人工智能"],
  [/\bLLM(s)?\b/gi, "大语言模型"],
  [/\bGPU(s)?\b/gi, "图形处理器"],
  [/\bCPU(s)?\b/gi, "中央处理器"],
  [/\bTPU(s)?\b/gi, "张量处理器"],
  [/\bAPI(s)?\b/gi, "接口"],
  [/\bSDK(s)?\b/gi, "开发工具包"],
  [/\bIT\b/gi, "信息技术"],
  [/\bPC(s)?\b/gi, "电脑"],
  [/\bApp(s)?\b/gi, "应用"],
  [/\bAgent(s)?\b/gi, "智能体"],
  [/\bToken(s)?\b/gi, "词元"],
  [/\bCode\b/gi, "代码"],
  [/\bCoding\b/gi, "编程"],
  [/\bModel(s)?\b/gi, "模型"],
  [/\bBenchmark(s)?\b/gi, "基准测试"],
  [/\bRobot(s|ics)?\b/gi, "机器人"],
  [/\bHumanoid\b/gi, "人形机器人"],
  [/\bVision\b/gi, "视觉"],
  [/\bCloud\b/gi, "云服务"],
  [/\bChip(s)?\b/gi, "芯片"],
  [/\bFunding\b/gi, "融资"],
  [/\bStartup(s)?\b/gi, "创业公司"],
  [/\bIPO\b/gi, "首次公开募股"],
  [/\bCEO\b/gi, "首席执行官"],
  [/\bACM\b/gi, "国际计算机学会"],
  [/\barXiv\b/gi, "论文预印本"],
  [/\bAnnounce Type\b/gi, "发布类型"],
  [/\bAbstract\b/gi, "摘要"],
  [/\bGitHub\b/gi, "代码托管平台"],
  [/\bApache\b/gi, "阿帕奇"],
  [/\bComing\b/gi, "即将推出"],
  [/\bReportedly\b/gi, "据报道"],
  [/\bResearch\b/gi, "研究"],
  [/\bSafety\b/gi, "安全"],
  [/\bPolicy\b/gi, "政策"],
  [/\bRegulation\b/gi, "监管"],
  [/\bWorkflow\b/gi, "工作流"],
  [/\bData\b/gi, "数据"],
  [/\bSecurity\b/gi, "安全"],
  [/\bNews\b/gi, "新闻"],
  [/\bReview\b/gi, "评测"],
  [/\bLive\b/gi, "实时"]
];

const ENGLISH_PHRASE_REPLACEMENTS = [
  [/\bGoogle AI Studio\b/gi, "谷歌人工智能工作室"],
  [/\bGoogle Beam\b/gi, "谷歌光束会议服务"],
  [/\bGoogle I\/O\b/gi, "谷歌开发者大会"],
  [/\bI\/O\b/gi, "开发者大会"],
  [/\bGemini Omni\b/gi, "双子座全能模型"],
  [/\bBoston Children(?:'s|’s)? Hospital\b/gi, "波士顿儿童医院"],
  [/\bBoston Children(?:'s|’s)?\b/gi, "波士顿儿童医院"],
  [/\bGitHub Advanced Security\b/gi, "代码托管平台高级安全"],
  [/\bGitHub Actions\b/gi, "代码托管平台自动化流程"],
  [/\bGitHub Copilot\b/gi, "代码托管平台智能编程助手"],
  [/\bCopilot usage metrics API\b/gi, "智能编程助手使用指标接口"],
  [/\bCopilot Memory\b/gi, "智能编程助手记忆功能"],
  [/\bCopilot CLI\b/gi, "智能编程助手命令行工具"],
  [/\bAI adoption\b/gi, "人工智能采用情况"],
  [/\bhard budget limits\b/gi, "硬性预算上限"],
  [/\bquery accuracy\b/gi, "查询准确性"],
  [/\bmodel rules\b/gi, "模型规则"],
  [/\bversion updates\b/gi, "版本更新"],
  [/\bAI Factories\b/gi, "人工智能工厂"],
  [/\bthe real world\b/gi, "现实世界"],
  [/\breal world\b/gi, "现实世界"],
  [/\bnext wave\b/gi, "下一波浪潮"],
  [/\bPyTorch\b/gi, "开源深度学习框架"],
  [/\btorch\.profiler\b/gi, "性能分析工具"],
  [/\bTrillion Parameters\b/gi, "万亿参数"],
  [/\bDelta Weight Sync\b/gi, "增量权重同步"],
  [/\bSpeed-of-Light Text Generation\b/gi, "高速文本生成"],
  [/\bturns? customer requests? into code\b/gi, "把客户需求转化为代码"],
  [/\bcustomer requests?\b/gi, "客户需求"],
  [/\bsocietal resilience\b/gi, "社会韧性"],
  [/\bthird party evaluations?\b/gi, "第三方评测"],
  [/\btrustworthy third party evaluations?\b/gi, "可信第三方评测"],
  [/\bshared playbook\b/gi, "共同指南"],
  [/\bFrontier Governance Framework\b/gi, "前沿治理框架"],
  [/\bAI-native\b/gi, "人工智能原生"],
  [/\bagentic organization\b/gi, "智能体化组织"],
  [/\benterprise engineering\b/gi, "企业工程"],
  [/\bself-improving tax agents?\b/gi, "自我改进的税务智能体"],
  [/\belection information\b/gi, "选举信息"],
  [/\bcontent partnership\b/gi, "内容合作"],
  [/\benterprise coding agents?\b/gi, "企业编程智能体"],
  [/\bcheck out\b/gi, "查看"],
  [/\btake our\b/gi, "参加"],
  [/\bcatch up on\b/gi, "回顾"],
  [/\bin action\b/gi, "实战"],
  [/\bartificial general intelligence\b/gi, "通用人工智能"],
  [/\bartificial intelligence\b/gi, "人工智能"],
  [/\bgenerative artificial intelligence\b/gi, "生成式人工智能"],
  [/\bgenerative ai\b/gi, "生成式人工智能"],
  [/\blarge language models?\b/gi, "大语言模型"],
  [/\bfoundation models?\b/gi, "基础模型"],
  [/\bmachine learning\b/gi, "机器学习"],
  [/\bdeep learning\b/gi, "深度学习"],
  [/\breinforcement learning\b/gi, "强化学习"],
  [/\bcomputer vision\b/gi, "计算机视觉"],
  [/\bnatural language processing\b/gi, "自然语言处理"],
  [/\bopen source\b/gi, "开源"],
  [/\bpublic preview\b/gi, "公开预览"],
  [/\bgeneral availability\b/gi, "正式可用"],
  [/\bnow available\b/gi, "现已可用"],
  [/\bcoming soon\b/gi, "即将推出"],
  [/\bcase study\b/gi, "案例研究"],
  [/\bsafety research\b/gi, "安全研究"],
  [/\bpolicy update\b/gi, "政策更新"],
  [/\bdeveloper tools?\b/gi, "开发者工具"],
  [/\bcode generation\b/gi, "代码生成"],
  [/\bcoding agent\b/gi, "编程智能体"],
  [/\bsoftware engineering\b/gi, "软件工程"],
  [/\bdata center\b/gi, "数据中心"],
  [/\bcloud computing\b/gi, "云计算"],
  [/\bmodel card\b/gi, "模型说明"],
  [/\btechnical report\b/gi, "技术报告"],
  [/\bresearch paper\b/gi, "研究论文"],
  [/\bbenchmark results?\b/gi, "基准测试结果"],
  [/\bimage generation\b/gi, "图像生成"],
  [/\bvideo generation\b/gi, "视频生成"],
  [/\bspeech recognition\b/gi, "语音识别"],
  [/\btext to speech\b/gi, "文本转语音"],
  [/\bmultimodal\b/gi, "多模态"],
  [/\bhumanoid robots?\b/gi, "人形机器人"],
  [/\bautonomous driving\b/gi, "自动驾驶"],
  [/\bresponsible ai\b/gi, "负责任人工智能"],
  [/\bfrontier models?\b/gi, "前沿模型"],
  [/\bon device\b/gi, "端侧"],
  [/\breal time\b/gi, "实时"]
];

const ENGLISH_WORD_REPLACEMENTS = [
  [/\bquiz(?:zes)?\b/gi, "测验"],
  [/\bvibe\b/gi, "氛围式"],
  [/\bcoded\b/gi, "编写"],
  [/\bdemo(?:s)?\b/gi, "演示"],
  [/\bprototype(?:s)?\b/gi, "原型"],
  [/\bfutures\b/gi, "未来"],
  [/\blab(?:s)?\b/gi, "实验室"],
  [/\bcatch\b/gi, "回顾"],
  [/\bmajor\b/gi, "重要"],
  [/\bmoment(?:s)?\b/gi, "时刻"],
  [/\bdialogue(?:s)?\b/gi, "对话"],
  [/\bstage\b/gi, "舞台"],
  [/\binvestment(?:s)?\b/gi, "投资"],
  [/\bmissouri\b/gi, "密苏里"],
  [/\bmeeting(?:s)?\b/gi, "会议"],
  [/\bgroup\b/gi, "群组"],
  [/\bdiagnos(?:is|es)\b/gi, "诊断"],
  [/\bhospital\b/gi, "医院"],
  [/\bpatient\b/gi, "患者"],
  [/\bcare\b/gi, "护理"],
  [/\boperational\b/gi, "运营"],
  [/\bburden\b/gi, "负担"],
  [/\brare\b/gi, "罕见"],
  [/\bdisease(?:s)?\b/gi, "疾病"],
  [/\bmetric(?:s)?\b/gi, "指标"],
  [/\bcohort(?:s)?\b/gi, "分组"],
  [/\badoption\b/gi, "采用"],
  [/\bbudget\b/gi, "预算"],
  [/\blimit(?:s)?\b/gi, "限制"],
  [/\badvanced\b/gi, "高级"],
  [/\bquality\b/gi, "质量"],
  [/\brepository\b/gi, "仓库"],
  [/\benablement\b/gi, "启用"],
  [/\borganization(?:s)?\b/gi, "组织"],
  [/\brule(?:s)?\b/gi, "规则"],
  [/\bdeletion\b/gi, "删除"],
  [/\bscope\b/gi, "范围"],
  [/\bcontrol(?:s)?\b/gi, "控制"],
  [/\bdependabot\b/gi, "依赖更新工具"],
  [/\becosystem\b/gi, "生态"],
  [/\bprofiling\b/gi, "性能分析"],
  [/\bbeginner(?:'s|’s)?\b/gi, "入门"],
  [/\bguide\b/gi, "指南"],
  [/\bscore(?:s)?\b/gi, "得分"],
  [/\bbelow\b/gi, "低于"],
  [/\btask(?:s)?\b/gi, "任务"],
  [/\bshipping\b/gi, "交付"],
  [/\bhub\b/gi, "平台"],
  [/\bbucket\b/gi, "存储桶"],
  [/\bharness\b/gi, "工具链"],
  [/\bscaffold\b/gi, "脚手架"],
  [/\bterm(?:s)?\b/gi, "术语"],
  [/\bworth\b/gi, "值得"],
  [/\bright\b/gi, "准确"],
  [/\btowards\b/gi, "迈向"],
  [/\bspecialization\b/gi, "专用化"],
  [/\bscale\b/gi, "规模"],
  [/\bstrategic\b/gi, "战略"],
  [/\bvariable\b/gi, "变量"],
  [/\bprocurement\b/gi, "采购"],
  [/\bdecision(?:s)?\b/gi, "决策"],
  [/\boverlook\b/gi, "忽视"],
  [/\bearth\b/gi, "地球"],
  [/\bobservation\b/gi, "观测"],
  [/\bfamily\b/gi, "系列"],
  [/\befficient\b/gi, "高效"],
  [/\bsimulation\b/gi, "仿真"],
  [/\binfrastructure\b/gi, "基础设施"],
  [/\bintelligence\b/gi, "智能"],
  [/\bempower\b/gi, "赋能"],
  [/\bbuilder(?:s)?\b/gi, "建设者"],
  [/\bdemand\b/gi, "需求"],
  [/\bintroducing\b/gi, "推出"],
  [/\bhow\b/gi, ""],
  [/\bturn(?:s|ed|ing)?\b/gi, "转化"],
  [/\bunlock(?:s|ed|ing)?\b/gi, "解锁"],
  [/\bstrengthen(?:s|ed|ing)?\b/gi, "强化"],
  [/\bredefine[sd]?\b/gi, "重新定义"],
  [/\baim(?:s|ed|ing)?\b/gi, "目标是"],
  [/\bbecome\b/gi, "成为"],
  [/\bshare[sd]?\b/gi, "分享"],
  [/\bexplore[sd]?\b/gi, "探索"],
  [/\blearn\b/gi, "了解"],
  [/\bsee\b/gi, "查看"],
  [/\bship(?:s|ped|ping)?\b/gi, "交付"],
  [/\bautomate[sd]?\b/gi, "自动化"],
  [/\breduce[sd]?\b/gi, "减少"],
  [/\bdeliver(?:s|ed|ing)?\b/gi, "交付"],
  [/\bcoordinate[sd]?\b/gi, "协调"],
  [/\bannouncing\b/gi, "宣布"],
  [/\bannounce[sd]?\b/gi, "宣布"],
  [/\brelease[sd]?\b/gi, "发布"],
  [/\blaunch(?:es|ed)?\b/gi, "推出"],
  [/\bunveil(?:s|ed)?\b/gi, "发布"],
  [/\bupdate[sd]?\b/gi, "更新"],
  [/\bexpand(?:s|ed)?\b/gi, "扩展"],
  [/\bbring(?:s|ing)?\b/gi, "带来"],
  [/\badd(?:s|ed|ing)?\b/gi, "新增"],
  [/\bbuild(?:s|ing)?\b/gi, "构建"],
  [/\bhelp(?:s|ed|ing)?\b/gi, "帮助"],
  [/\buse(?:s|d|ing)?\b/gi, "使用"],
  [/\bcreate[sd]?\b/gi, "创建"],
  [/\bgenerate[sd]?\b/gi, "生成"],
  [/\btrain(?:s|ed|ing)?\b/gi, "训练"],
  [/\bevaluate[sd]?\b/gi, "评估"],
  [/\bimprove[sd]?\b/gi, "改进"],
  [/\baccelerate[sd]?\b/gi, "加速"],
  [/\bpower(?:s|ed|ing)?\b/gi, "驱动"],
  [/\bsupport(?:s|ed|ing)?\b/gi, "支持"],
  [/\bprotect(?:s|ed|ing)?\b/gi, "保护"],
  [/\bsecure[sd]?\b/gi, "保障安全"],
  [/\bnew\b/gi, "新"],
  [/\bbetter\b/gi, "更好"],
  [/\bfaster\b/gi, "更快"],
  [/\bsmarter\b/gi, "更智能"],
  [/\bfirst\b/gi, "首个"],
  [/\bglobal\b/gi, "全球"],
  [/\benterprise\b/gi, "企业"],
  [/\bbusiness(?:es)?\b/gi, "企业"],
  [/\bdeveloper(?:s)?\b/gi, "开发者"],
  [/\buser(?:s)?\b/gi, "用户"],
  [/\bcustomer(?:s)?\b/gi, "客户"],
  [/\bteam(?:s)?\b/gi, "团队"],
  [/\bcompany|companies\b/gi, "公司"],
  [/\bgovernment\b/gi, "政府"],
  [/\beducation\b/gi, "教育"],
  [/\bhealthcare\b/gi, "医疗"],
  [/\bscience\b/gi, "科学"],
  [/\bresearch(?:ers)?\b/gi, "研究"],
  [/\bpaper(?:s)?\b/gi, "论文"],
  [/\bmodel(?:s)?\b/gi, "模型"],
  [/\btool(?:s)?\b/gi, "工具"],
  [/\bplatform(?:s)?\b/gi, "平台"],
  [/\bservice(?:s)?\b/gi, "服务"],
  [/\bproduct(?:s)?\b/gi, "产品"],
  [/\bfeature(?:s)?\b/gi, "功能"],
  [/\bapp(?:s)?\b/gi, "应用"],
  [/\bagent(?:s)?\b/gi, "智能体"],
  [/\bassistant(?:s)?\b/gi, "助手"],
  [/\bworkflow(?:s)?\b/gi, "工作流"],
  [/\bcode\b/gi, "代码"],
  [/\bcoding\b/gi, "编程"],
  [/\bsoftware\b/gi, "软件"],
  [/\bdata\b/gi, "数据"],
  [/\bcloud\b/gi, "云服务"],
  [/\bsecurity\b/gi, "安全"],
  [/\bsafety\b/gi, "安全"],
  [/\bprivacy\b/gi, "隐私"],
  [/\bpolicy\b/gi, "政策"],
  [/\bregulation\b/gi, "监管"],
  [/\brisk(?:s)?\b/gi, "风险"],
  [/\bchip(?:s)?\b/gi, "芯片"],
  [/\bgpu(?:s)?\b/gi, "图形处理器"],
  [/\binference\b/gi, "推理"],
  [/\breasoning\b/gi, "推理能力"],
  [/\btoken(?:s)?\b/gi, "词元"],
  [/\bcontext\b/gi, "上下文"],
  [/\bmemory\b/gi, "记忆"],
  [/\bimage(?:s)?\b/gi, "图像"],
  [/\bvideo(?:s)?\b/gi, "视频"],
  [/\baudio\b/gi, "音频"],
  [/\bspeech\b/gi, "语音"],
  [/\blanguage\b/gi, "语言"],
  [/\bvision\b/gi, "视觉"],
  [/\brobot(?:s|ics)?\b/gi, "机器人"],
  [/\bhumanoid\b/gi, "人形"],
  [/\bbenchmark(?:s)?\b/gi, "基准测试"],
  [/\bevaluation(?:s)?\b/gi, "评测"],
  [/\bperformance\b/gi, "性能"],
  [/\bcost(?:s)?\b/gi, "成本"],
  [/\bopen\b/gi, "开放"],
  [/\bsource\b/gi, "来源"],
  [/\bpreview\b/gi, "预览"],
  [/\bavailable\b/gi, "可用"],
  [/\baccess\b/gi, "访问"],
  [/\bcommunity\b/gi, "社区"],
  [/\becosystem\b/gi, "生态"],
  [/\bpartner(?:s)?\b/gi, "合作伙伴"],
  [/\bwith\b/gi, "借助"],
  [/\bfor\b/gi, "面向"],
  [/\bfrom\b/gi, "来自"],
  [/\binto\b/gi, "进入"],
  [/\bon\b/gi, "在"],
  [/\bin\b/gi, "在"],
  [/\bto\b/gi, "向"],
  [/\band\b/gi, "和"],
  [/\bthe\b/gi, ""],
  [/\ba\b/gi, ""],
  [/\ban\b/gi, ""],
  [/\bof\b/gi, ""],
  [/\bis\b/gi, ""],
  [/\bare\b/gi, ""],
  [/\bbe\b/gi, ""],
  [/\bby\b/gi, "由"],
  [/\bas\b/gi, "作为"],
  [/\bat\b/gi, "在"]
];

const containsChinese = (value) => /[\u3400-\u9fff]/.test(value);

const compactText = (value, maxLength = 190) => {
  const text = value
    .replace(/,\s*/g, "，")
    .replace(/(?<!\d)\.(?!\d)/g, "。")
    .replace(/(\d)\.(?!\d)/g, "$1。")
    .replace(/!/g, "！")
    .replace(/\?/g, "？")
    .replace(/\s+/g, " ")
    .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g, "$1")
    .replace(/\s*([，。！？；：、])\s*/g, "$1")
    .replace(/([，。！？；：、]){2,}/g, "$1")
    .replace(/^[，。！？；：、\s]+|[，；：、\s]+$/g, "")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}……` : text;
};

const translateEnglishEssence = (value) => {
  let text = value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");

  for (const [pattern, replacement] of ENGLISH_PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of DISPLAY_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of ENGLISH_WORD_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\b[A-Za-z][A-Za-z0-9+._-]*\b/g, "相关技术")
    .replace(/相关技术(\s*相关技术)+/g, "相关技术")
    .replace(/["'()[\]{}<>]/g, " ")
    .replace(/\s*[|/]\s*/g, "，")
    .replace(/\s*-\s*/g, "，")
    .replace(/\s+/g, " ");
};

const localizeDisplayText = (value, options = {}) => {
  let text = stripHtml(value);
  if (options.originLanguage === "en" || !containsChinese(text)) {
    text = translateEnglishEssence(text);
  }
  text = text.replace(/IT之家/g, "科技之家");
  text = text.replace(/\b([A-H])轮/g, (_, round) => `${ROUND_LABELS[round] || round}融资`);
  text = text.replace(/arxiv\s*:\s*(\d+(?:\.\d+)?)v(\d+)/gi, (_, paperId, version) => `论文编号 ${paperId} 第${version}版`);
  text = text.replace(/\bV(\d+)\b/gi, (_, version) => `第${version}代`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*mAh\b/gi, "$1 毫安时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*Wh\b/gi, "$1 瓦时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*kWh\b/gi, "$1 千瓦时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*GHz\b/gi, "$1 吉赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MHz\b/gi, "$1 兆赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*Hz\b/gi, "$1 赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*nits?\b/gi, "$1 尼特");
  text = text.replace(/(\d+(?:\.\d+)?)\s*W\b/g, "$1 瓦");
  text = text.replace(/(\d+(?:\.\d+)?)\s*km\b/gi, "$1 千米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm\b/gi, "$1 厘米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 毫米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*nm\b/gi, "$1 纳米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MP\b/gi, "$1 百万像素");
  text = text.replace(/(\d+(?:\.\d+)?)\s*kg\b/gi, "$1 千克");
  text = text.replace(/(\d+(?:\.\d+)?)\s*g\b/gi, "$1 克");
  text = text.replace(/(\d+(?:\.\d+)?)\s*L\b/g, "$1 升");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MB\b/gi, "$1 兆字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*GB\b/gi, "$1 吉字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*TB\b/gi, "$1 太字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*B\b/g, "$1 十亿");
  text = text.replace(/(\d+(?:\.\d+)?)\s*M\b/g, "$1 百万");
  text = text.replace(/(\d+(?:\.\d+)?)\s*TOPS\b/gi, "$1 万亿次运算");
  for (const [pattern, replacement] of DISPLAY_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text
    .replace(/\b(?=[A-Za-z0-9+._-]*[A-Za-z])(?=[A-Za-z0-9+._-]*\d)[A-Za-z0-9+._-]+\b/g, "相关型号")
    .replace(/\b[A-Za-z][A-Za-z0-9+._-]*\b/g, "相关技术")
    .replace(/\s+-\s+/g, "，来源：")
    .replace(/\s+\|\s+/g, "，")
    .replace(/相关技术(\s*相关技术)+/g, "相关技术")
    .replace(/\s+/g, " ")
    .replace(/([，。！？；：])\s+/g, "$1")
    .trim();

  text = compactText(text, options.maxLength || 190);
  if (!containsChinese(text)) return options.fallback || "来自权威公开来源的人工智能相关动态。";
  return text;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  trimValues: true
});

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return value.__cdata || value["#text"] || value["@_href"] || "";
  return "";
};

const decodeEntities = (value) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value) =>
  decodeEntities(getText(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const nextCadenceTimestamp = (base = Date.now()) => {
  const cadenceMs = CADENCE_MINUTES * 60 * 1000;
  return new Date(Math.ceil((base + 1000) / cadenceMs) * cadenceMs).toISOString();
};

const normalizeTitle = (title) =>
  title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, " ")
    .replace(/\b(the|a|an|to|of|for|and|in|on|with|from|by|is|are)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isLatinKeyword = (value) => /^[a-z0-9+._\-\s]+$/i.test(value);

const keywordMatches = (text, keyword) => {
  if (isLatinKeyword(keyword)) {
    return new RegExp(`(?<![a-z0-9])${escapeRegExp(keyword.toLowerCase())}(?![a-z0-9])`, "i").test(text);
  }
  return text.includes(keyword.toLowerCase());
};

const canonicalUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) =>
      url.searchParams.delete(key)
    );
    return url.toString();
  } catch {
    return rawUrl;
  }
};

const isChinaReachableUrl = (rawUrl) => {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    return CHINA_REACHABLE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const isAllowedNewsUrl = (rawUrl, source) => {
  if (isChinaReachableUrl(rawUrl)) return true;
  if (!source.allowExternal) return false;
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    return ALLOWED_EXTERNAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const pickLink = (item) => {
  if (typeof item.link === "string") return item.link;
  if (Array.isArray(item.link)) {
    const alternate = item.link.find((link) => link["@_rel"] === "alternate") || item.link[0];
    return alternate?.["@_href"] || getText(alternate);
  }
  return item.link?.["@_href"] || item.guid?.["#text"] || getText(item.guid) || "";
};

const pickImage = (item) => {
  const mediaContent = asArray(item["media:content"]).find((entry) => entry?.["@_url"]);
  const mediaThumbnail = asArray(item["media:thumbnail"]).find((entry) => entry?.["@_url"]);
  const enclosure = asArray(item.enclosure).find((entry) => entry?.["@_type"]?.startsWith?.("image/"));
  return mediaContent?.["@_url"] || mediaThumbnail?.["@_url"] || enclosure?.["@_url"] || item.image?.url || "";
};

const extractItems = (xml) => {
  const parsed = parser.parse(xml);
  if (parsed.rss?.channel?.item) return asArray(parsed.rss.channel.item);
  if (parsed.feed?.entry) return asArray(parsed.feed.entry);
  if (parsed.RDF?.item) return asArray(parsed.RDF.item);
  return [];
};

const extractSourceItems = (body, source) => {
  return extractItems(body);
};

const hasAiSignal = (text, source) => {
  if (source.aiFocused) return true;
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => !WEAK_AI_KEYWORDS.has(keyword) && keywordMatches(lower, keyword));
};

const inferTopics = (text) => {
  const lower = text.toLowerCase();
  const topics = TOPIC_RULES.filter((rule) => rule.keys.some((key) => lower.includes(key.toLowerCase()))).map(
    (rule) => rule.name
  );
  return topics.length ? topics.slice(0, 3) : ["人工智能动态"];
};

const heatScore = ({ publishedAt, source, topics, text }) => {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 36e5);
  const recency = Math.max(0, 48 - ageHours) * 0.85;
  const sourceBoost = source.weight * 18;
  const topicBoost = Math.min(18, topics.length * 5);
  const titleBoost = /openai|anthropic|google|deepmind|nvidia|claude|gemini|gpt|deepseek|qwen|kimi|监管|大模型|英伟达|深度求索|通义|千问|月之暗面/i.test(text)
    ? 8
    : 0;
  return Math.max(28, Math.min(99, Math.round(24 + recency + sourceBoost + topicBoost + titleBoost)));
};

const summarize = (raw, title) => {
  const cleaned = stripHtml(raw);
  if (!cleaned || cleaned === title) return "来自权威公开来源的人工智能相关动态，点击原文查看完整报道。";
  return cleaned;
};

const isResearchPaperSource = (source) => source.id.startsWith("arxiv-");

const inferResearchFocus = (text) => {
  const lower = text.toLowerCase();
  const focus = RESEARCH_FOCUS_RULES.filter((rule) => rule.keys.some((key) => lower.includes(key))).map(
    (rule) => rule.label
  );
  return [...new Set(focus)].slice(0, 4);
};

const buildResearchTitle = (rawTitle, rawSummary) => {
  const focus = inferResearchFocus(`${rawTitle} ${rawSummary}`);
  if (!focus.length) return "论文新进展：人工智能前沿研究";
  return `论文新进展：${focus.join("、")}方向研究`;
};

const buildResearchSummary = (rawTitle, rawSummary, source) => {
  const focus = inferResearchFocus(`${rawTitle} ${rawSummary}`);
  const focusText = focus.length ? focus.join("、") : source.name.replace("论文预印本：", "");
  return `这篇论文关注${focusText}，用于跟踪人工智能前沿研究趋势。页面已将原始英文题名和摘要转写为中文要点，原文链接可能受网络环境影响。`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOnce = async (source) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Chinese-AI-News-Timeline/0.2)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchWithTimeout = async (source) => {
  let lastError;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      return await fetchOnce(source);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) await sleep(800 * (attempt + 1));
    }
  }
  throw lastError;
};

const normalizeItem = (item, source) => {
  const rawTitle = stripHtml(item.title);
  const link = canonicalUrl(pickLink(item));
  const rawPublished = item.pubDate || item.published || item.updated || item["dc:date"] || item.created;
  const publishedAt = new Date(getText(rawPublished) || Date.now()).toISOString();
  const rawSummary = summarize(item.description || item.summary || item.content || item["content:encoded"], rawTitle);
  const title = isResearchPaperSource(source)
    ? buildResearchTitle(rawTitle, rawSummary)
    : localizeDisplayText(rawTitle, {
        originLanguage: source.originLanguage,
        fallback: `${source.name}发布人工智能相关动态。`,
        maxLength: 120
      });
  const summary = isResearchPaperSource(source)
    ? buildResearchSummary(rawTitle, rawSummary, source)
    : localizeDisplayText(rawSummary, {
        originLanguage: source.originLanguage,
        fallback: `来自${source.name}的人工智能相关动态，已转写为中文摘要。`,
        maxLength: 190
      });
  const text = `${rawTitle} ${rawSummary} ${title} ${summary}`;

  if (!title || !link || !isAllowedNewsUrl(link, source) || !hasAiSignal(text, source)) return null;

  const topics = inferTopics(text);
  return {
    id: `${source.id}-${normalizeTitle(title).slice(0, 64).replace(/\s/g, "-")}`,
    title,
    url: link,
    source: source.name,
    sourceId: source.id,
    sourceType: source.type,
    language: "zh",
    publishedAt,
    summary,
    topics,
    heat: heatScore({ publishedAt, source, topics, text }),
    image: pickImage(item)
  };
};

const dedupeItems = (items) => {
  const seen = new Map();
  const selected = [];

  const titleTokens = (title) => {
    const normalized = normalizeTitle(title);
    const tokens = normalized
      .split(" ")
      .filter((token) => token.length > 1 && !["相关技术", "人工智能", "动态", "发布"].includes(token));
    const cjkText = normalized.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < cjkText.length - 1; index += 1) {
      tokens.push(cjkText.slice(index, index + 2));
    }
    for (let index = 0; index < cjkText.length - 2; index += 1) {
      tokens.push(cjkText.slice(index, index + 3));
    }
    return tokens;
  };

  const similarity = (a, b) => {
    const left = new Set(titleTokens(a));
    const right = new Set(titleTokens(b));
    if (!left.size || !right.size) return 0;
    const overlap = [...left].filter((token) => right.has(token)).length;
    return overlap / Math.min(left.size, right.size);
  };

  for (const item of items) {
    const titleKey = normalizeTitle(item.title);
    const key = item.url || titleKey.slice(0, 96);
    const previous = seen.get(key);
    if (!previous || item.heat > previous.heat) {
      seen.set(key, item);
    }
  }

  for (const item of seen.values()) {
    const duplicateIndex = selected.findIndex((existing) => {
      const score = similarity(existing.title, item.title);
      if (existing.sourceId === item.sourceId) return score >= 0.82;
      return existing.sourceType === "media" && item.sourceType === "media" && score >= 0.96;
    });
    if (duplicateIndex === -1) {
      selected.push(item);
    } else if (item.heat > selected[duplicateIndex].heat) {
      selected[duplicateIndex] = item;
    }
  }

  return selected;
};

const compareItemsByFreshness = (a, b) => {
  const timeDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return b.heat - a.heat;
};

const diversifyItemsBySource = (items, maxItems) => {
  const buckets = new Map();
  for (const item of [...items].sort(compareItemsByFreshness)) {
    if (!buckets.has(item.sourceId)) buckets.set(item.sourceId, []);
    buckets.get(item.sourceId).push(item);
  }

  const sourceOrder = [...buckets.keys()];
  const sortSourcesByNextItem = () => {
    sourceOrder.sort((left, right) => {
      const leftItem = buckets.get(left)?.[0];
      const rightItem = buckets.get(right)?.[0];
      if (!leftItem && !rightItem) return 0;
      if (!leftItem) return 1;
      if (!rightItem) return -1;
      return compareItemsByFreshness(leftItem, rightItem);
    });
  };

  const selected = [];
  sortSourcesByNextItem();

  while (selected.length < maxItems) {
    let added = false;
    for (const sourceId of sourceOrder) {
      const bucket = buckets.get(sourceId);
      if (!bucket?.length) continue;
      selected.push(bucket.shift());
      added = true;
      if (selected.length >= maxItems) break;
    }
    if (!added) break;
    sortSourcesByNextItem();
  }

  return selected;
};

const buildTopicStats = (items) => {
  const topicMap = new Map();
  for (const item of items) {
    for (const topic of item.topics) {
      const current = topicMap.get(topic) || { name: topic, count: 0, heat: 0 };
      current.count += 1;
      current.heat += item.heat;
      topicMap.set(topic, current);
    }
  }
  return [...topicMap.values()]
    .map((topic) => ({ ...topic, heat: Math.round(topic.heat / topic.count) }))
    .sort((a, b) => b.count * b.heat - a.count * a.heat)
    .slice(0, 12);
};

const main = async () => {
  await mkdir(new URL("../public", import.meta.url), { recursive: true });

  const settled = await Promise.allSettled(
    SOURCE_DEFINITIONS.map(async (source) => {
      try {
        const xml = await fetchWithTimeout(source);
        const normalized = extractSourceItems(xml, source)
          .map((item) => normalizeItem(item, source))
          .filter(Boolean)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, source.maxItems || DEFAULT_SOURCE_ITEM_LIMIT);
        return { source, items: normalized };
      } catch (error) {
        throw new Error(`${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );

  const successes = [];
  const failures = [];
  for (const result of settled) {
    if (result.status === "fulfilled") successes.push(result.value);
    else failures.push(result.reason?.message || String(result.reason));
  }

  const cutoff = Date.now() - WINDOW_HOURS * 36e5;
  const eligibleItems = dedupeItems(successes.flatMap((entry) => entry.items)).filter(
    (item) => new Date(item.publishedAt).getTime() >= cutoff
  );
  const items = diversifyItemsBySource(eligibleItems, MAX_ITEMS);

  const displayedBySource = items.reduce((acc, item) => {
    const current = acc.get(item.sourceId) || { count: 0, latest: item.publishedAt };
    current.count += 1;
    if (new Date(item.publishedAt).getTime() > new Date(current.latest).getTime()) current.latest = item.publishedAt;
    acc.set(item.sourceId, current);
    return acc;
  }, new Map());

  const generatedAt = new Date().toISOString();
  const sourceHealth = SOURCE_DEFINITIONS.map((source) => {
    const success = successes.find((entry) => entry.source.id === source.id);
    const displayed = displayedBySource.get(source.id);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      type: source.type,
      language: source.language,
      originLanguage: source.originLanguage || source.language,
      ok: Boolean(success),
      itemCount: success?.items.length || 0,
      displayedCount: displayed?.count || 0,
      latestFetchedAt: success?.items[0]?.publishedAt || "",
      latestDisplayedAt: displayed?.latest || ""
    };
  });

  const payload = {
    generatedAt,
    cadenceMinutes: CADENCE_MINUTES,
    nextUpdateHint: nextCadenceTimestamp(),
    stats: {
      total: items.length,
      sourceCount: SOURCE_DEFINITIONS.length,
      sourcesSucceeded: successes.length,
      sourcesFailed: SOURCE_DEFINITIONS.length - successes.length,
      windowHours: WINDOW_HOURS,
      latestPublishedAt: items[0]?.publishedAt || generatedAt
    },
    topics: buildTopicStats(items),
    sources: sourceHealth,
    failures,
    items
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(
    SOURCES_PATH,
    `${JSON.stringify(
      SOURCE_DEFINITIONS.map(({ id, name, url, type, language, originLanguage }) => ({
        id,
        name,
        url,
        type,
        language,
        originLanguage: originLanguage || language
      })),
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Generated ${items.length} AI news items from ${successes.length}/${SOURCE_DEFINITIONS.length} sources.`);
  if (failures.length) console.log(`Failures: ${failures.join(" | ")}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
