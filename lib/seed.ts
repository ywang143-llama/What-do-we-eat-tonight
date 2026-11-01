import type { Dish, KitchenSnapshot, Order, Rating, Wish } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const xcf = (keyword: string) =>
  `https://www.xiachufang.com/search/?keyword=${encodeURIComponent(keyword)}`;

type DishSeed = Omit<Dish, "created_at">;

const DISHES: DishSeed[] = [
  // 主食
  {
    id: "dish-tomato-egg-noodles",
    name: "番茄鸡蛋面",
    category: "staple",
    calories: 520,
    emoji: "🍜",
    image_url: null,
    recipe_link: xcf("番茄鸡蛋面"),
    is_active: true,
    recipe_steps: [
      "番茄切块，鸡蛋加少许盐打散。",
      "热锅炒蛋盛出，下番茄炒出汁，加一碗热水煮开。",
      "下面条煮熟，放回鸡蛋，加盐和几滴香油，撒葱花。",
    ],
  },
  {
    id: "dish-yangzhou-fried-rice",
    name: "扬州炒饭",
    category: "staple",
    calories: 610,
    emoji: "🍚",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "隔夜米饭打散，虾仁、火腿、胡萝卜切丁。",
      "鸡蛋炒散，下配料翻炒，再下米饭炒到粒粒分明。",
      "用盐和白胡椒调味，撒葱花出锅。",
    ],
  },
  {
    id: "dish-scallion-noodles",
    name: "葱油拌面",
    category: "staple",
    calories: 480,
    emoji: "🍝",
    image_url: null,
    recipe_link: xcf("葱油拌面"),
    is_active: true,
    recipe_steps: [
      "小葱切段，冷油下锅小火炸到焦香，捞出葱段。",
      "加生抽、老抽和一点糖，调成葱油汁。",
      "面条煮熟，拌入葱油汁，放上葱段。",
    ],
  },
  {
    id: "dish-curry-chicken-rice",
    name: "咖喱鸡肉饭",
    category: "staple",
    calories: 680,
    emoji: "🍛",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "鸡腿肉、土豆、胡萝卜切块。",
      "炒香洋葱和鸡肉，加水煮开后放土豆胡萝卜炖 15 分钟。",
      "放咖喱块搅匀收汁，浇在米饭上。",
    ],
  },
  {
    id: "dish-pork-cabbage-dumplings",
    name: "猪肉白菜饺子",
    category: "staple",
    calories: 560,
    emoji: "🥟",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "白菜切碎撒盐挤水，和猪肉馅拌匀，加葱姜、生抽和香油调味。",
      "把馅料包进饺子皮，捏紧收口。",
      "水开下锅，点三次凉水，饺子浮起就熟了。",
    ],
  },

  // 蔬菜
  {
    id: "dish-garlic-broccoli",
    name: "蒜蓉西兰花",
    category: "vegetable",
    calories: 120,
    emoji: "🥦",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "西兰花掰小朵，盐水泡 10 分钟后焯水 1 分钟。",
      "蒜末小火炒香。",
      "下西兰花大火快炒，加盐和少许蚝油。",
    ],
  },
  {
    id: "dish-hand-torn-cabbage",
    name: "手撕包菜",
    category: "vegetable",
    calories: 150,
    emoji: "🥬",
    image_url: null,
    recipe_link: xcf("手撕包菜"),
    is_active: true,
    recipe_steps: [
      "包菜手撕成片，洗净沥干。",
      "干辣椒和蒜片爆香。",
      "大火下包菜快炒，沿锅边淋醋，加盐和生抽。",
    ],
  },
  {
    id: "dish-di-san-xian",
    name: "地三鲜",
    category: "vegetable",
    calories: 280,
    emoji: "🍆",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "茄子、土豆、青椒切块。",
      "茄子土豆分别煎到微焦。",
      "蒜末爆香，下全部食材，加生抽、糖和水淀粉翻炒收汁。",
    ],
  },
  {
    id: "dish-cucumber-salad",
    name: "凉拌黄瓜",
    category: "vegetable",
    calories: 80,
    emoji: "🥒",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "黄瓜拍裂切段，撒盐腌 5 分钟。",
      "倒掉腌出的水，加蒜末、醋、生抽、糖和香油。",
      "拌匀后冷藏 10 分钟，更爽口。",
    ],
  },
  {
    id: "dish-stir-fried-greens",
    name: "清炒时蔬",
    category: "vegetable",
    calories: 100,
    emoji: "🥬",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "青菜（上海青或油麦菜）洗净沥干。",
      "蒜末爆香。",
      "大火快炒，加盐，断生立刻出锅。",
    ],
  },

  // 肉类 / 蛋类
  {
    id: "dish-cola-wings",
    name: "可乐鸡翅",
    category: "meat",
    calories: 420,
    emoji: "🍗",
    image_url: null,
    recipe_link: xcf("可乐鸡翅"),
    is_active: true,
    recipe_steps: [
      "鸡翅两面划刀，冷水下锅焯水。",
      "煎到两面金黄，加姜片、生抽和少许老抽。",
      "倒入可乐没过鸡翅，中小火收汁，撒白芝麻。",
    ],
  },
  {
    id: "dish-red-braised-pork",
    name: "红烧肉",
    category: "meat",
    calories: 650,
    emoji: "🥩",
    image_url: null,
    recipe_link: xcf("红烧肉"),
    is_active: true,
    recipe_steps: [
      "五花肉切块，冷水下锅焯水。",
      "小火炒糖色，下肉块翻炒上色。",
      "加葱姜、八角、生抽老抽和热水，小火炖 50 分钟，最后大火收汁。",
    ],
  },
  {
    id: "dish-kung-pao-chicken",
    name: "宫保鸡丁",
    category: "meat",
    calories: 380,
    emoji: "🍗",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "鸡腿肉切丁，用生抽和淀粉腌 15 分钟。",
      "调好糖醋汁：生抽、醋、糖和水淀粉。",
      "炒香干辣椒花椒，下鸡丁和黄瓜丁，倒入料汁翻匀，撒花生米。",
    ],
  },
  {
    id: "dish-black-pepper-beef",
    name: "黑椒牛柳",
    category: "meat",
    calories: 360,
    emoji: "🥩",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "牛里脊切条，加生抽、黑椒和淀粉腌 20 分钟。",
      "洋葱和彩椒切条。",
      "大火滑炒牛柳盛出，炒香洋葱彩椒，回锅加黑椒酱快炒。",
    ],
  },
  {
    id: "dish-sweet-sour-ribs",
    name: "糖醋排骨",
    category: "meat",
    calories: 520,
    emoji: "🍖",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "排骨焯水后擦干。",
      "煎至微黄，加冰糖炒化上色。",
      "放醋、生抽、料酒和热水，小火焖 35 分钟，大火收成亮汁，撒芝麻。",
    ],
  },
  {
    id: "dish-pepper-pork",
    name: "青椒肉丝",
    category: "meat",
    calories: 320,
    emoji: "🌶️",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "里脊切丝，用生抽和淀粉抓匀。",
      "青椒切丝备用。",
      "热油滑炒肉丝盛出，炒香青椒，回锅加盐和少许蚝油。",
    ],
  },

  // 汤品 / 饮料
  {
    id: "dish-tomato-egg-soup",
    name: "番茄蛋花汤",
    category: "soup",
    calories: 90,
    emoji: "🍅",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "番茄切小块炒软。",
      "加两碗热水煮开。",
      "淋入蛋液，加盐和白胡椒，撒葱花和香油。",
    ],
  },
  {
    id: "dish-corn-rib-soup",
    name: "玉米排骨汤",
    category: "soup",
    calories: 210,
    emoji: "🌽",
    image_url: null,
    recipe_link: xcf("玉米排骨汤"),
    is_active: true,
    recipe_steps: [
      "排骨焯水洗净。",
      "和玉米段、姜片一起放入砂锅，加足量热水。",
      "小火炖 60 分钟，出锅前加盐。",
    ],
  },
  {
    id: "dish-seaweed-egg-soup",
    name: "紫菜蛋花汤",
    category: "soup",
    calories: 60,
    emoji: "🥣",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "紫菜撕小片，鸡蛋打散。",
      "水开下紫菜煮 1 分钟。",
      "淋蛋液，加盐、香油和葱花。",
    ],
  },
  {
    id: "dish-winter-melon-soup",
    name: "冬瓜丸子汤",
    category: "soup",
    calories: 150,
    emoji: "🍲",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "肉馅加葱姜、生抽和淀粉，搅打上劲。",
      "冬瓜切片煮开，挤入小肉丸。",
      "丸子浮起后加盐和白胡椒，撒香菜。",
    ],
  },
  {
    id: "dish-plum-drink",
    name: "冰镇酸梅汤",
    category: "soup",
    calories: 120,
    emoji: "🧋",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "乌梅、山楂、陈皮和甘草冲洗后泡 30 分钟。",
      "加水煮开，转小火 40 分钟。",
      "加冰糖融化，放凉后冷藏。",
    ],
  },

  // 小吃 / 甜品
  {
    id: "dish-brown-sugar-ciba",
    name: "红糖糍粑",
    category: "snack",
    calories: 330,
    emoji: "🍡",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "糍粑切条，小火煎到两面金黄。",
      "红糖加少量水熬成糖浆。",
      "淋在糍粑上，撒黄豆粉。",
    ],
  },
  {
    id: "dish-double-skin-milk",
    name: "双皮奶",
    category: "snack",
    calories: 220,
    emoji: "🍮",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "牛奶煮热倒入碗中，放凉结出奶皮。",
      "蛋清加糖搅匀，牛奶留皮倒出混合，再倒回碗里。",
      "盖保鲜膜蒸 12 分钟，关火焖 5 分钟。",
    ],
  },
  {
    id: "dish-roasted-sweet-potato",
    name: "烤红薯",
    category: "snack",
    calories: 180,
    emoji: "🍠",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "红薯洗净擦干。",
      "烤箱 200℃ 烤 60 分钟，或空气炸锅 190℃ 烤 40 分钟。",
      "捏起来软软的就好。",
    ],
  },
  {
    id: "dish-scallion-pancake",
    name: "葱油饼",
    category: "snack",
    calories: 350,
    emoji: "🫓",
    image_url: null,
    recipe_link: null,
    is_active: true,
    recipe_steps: [
      "面粉加温水和成软面团，醒 20 分钟。",
      "擀开抹油，撒盐和葱花，卷起再擀成饼。",
      "小火煎到两面金黄。",
    ],
  },
];

function buildDemoHistory(dishes: DishSeed[]): {
  order: Order;
  ratings: Rating[];
} {
  const orderId = "demo-order-yesterday";
  const createdAt = new Date(Date.now() - 86_400_000).toISOString();
  const completedAt = new Date(Date.now() - 78_000_000).toISOString();

  const picked = [
    dishes.find((dish) => dish.id === "dish-tomato-egg-noodles")!,
    dishes.find((dish) => dish.id === "dish-garlic-broccoli")!,
    dishes.find((dish) => dish.id === "dish-cola-wings")!,
  ];

  const order: Order = {
    id: orderId,
    order_date: todayISO(new Date(Date.now() - 86_400_000)),
    status: "completed",
    note: "今天想吃清淡一点点～",
    created_at: createdAt,
    submitted_at: createdAt,
    completed_at: completedAt,
    items: picked.map((dish, index) => ({
      id: `demo-item-${index + 1}`,
      order_id: orderId,
      dish_id: dish.id,
      status: "served",
      created_at: createdAt,
    })),
  };

  const ratings: Rating[] = [
    {
      id: "demo-rating-1",
      order_id: orderId,
      dish_id: "dish-tomato-egg-noodles",
      rating: 5,
      comment: "番茄汤底超浓郁，面条也刚刚好！",
      created_at: completedAt,
    },
    {
      id: "demo-rating-2",
      order_id: orderId,
      dish_id: "dish-garlic-broccoli",
      rating: 4,
      comment: "蒜香很足，下次少放一点点盐。",
      created_at: completedAt,
    },
    {
      id: "demo-rating-3",
      order_id: orderId,
      dish_id: "dish-cola-wings",
      rating: 5,
      comment: "甜咸口完美，鸡翅再多两个也吃得下。",
      created_at: completedAt,
    },
  ];

  return { order, ratings };
}

/** Fresh mock data. Used for local demo mode and as a reference for seed.sql. */
export function createSeedData(): KitchenSnapshot {
  const dishes: Dish[] = DISHES.map((dish, index) => ({
    ...dish,
    created_at: new Date(Date.now() - (5 * 86_400_000 - index * 60_000)).toISOString(),
  }));

  const { order, ratings } = buildDemoHistory(DISHES);

  const wishlist: Wish[] = [
    {
      id: "demo-wish-1",
      title: "麻辣香锅",
      note: "想吃微辣的，多加藕片和午餐肉。",
      status: "pending_review",
      source: "manual",
      dish_id: null,
      calories: null,
      ingredients: [],
      cover_image: null,
      rednote_url: null,
      created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      approved_at: null,
    },
    {
      id: "demo-wish-2",
      title: "糖醋排骨",
      note: "想吃酸甜口，多留点汁拌饭。",
      status: "ready",
      source: "manual",
      dish_id: "dish-sweet-sour-ribs",
      calories: 520,
      ingredients: ["排骨 500g", "冰糖 20g", "香醋 2 勺"],
      cover_image: null,
      rednote_url: null,
      created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      approved_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: "demo-wish-3",
      title: "番茄牛腩煲（小红书收藏）",
      note: "两人份，番茄要炖到化开，汤汁拿来泡饭最好吃。",
      status: "pending_review",
      source: "share",
      dish_id: null,
      calories: null,
      ingredients: [],
      cover_image: null,
      rednote_url:
        "https://www.xiaohongshu.com/search_result?keyword=%E7%95%AA%E8%8C%84%E7%89%9B%E8%85%A9",
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      approved_at: null,
    },
  ];

  return {
    dishes,
    orders: [order],
    ratings,
    wishlist,
  };
}
