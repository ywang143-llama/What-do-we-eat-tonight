-- ============================================================
--  今晚吃什么 · Tonight's Kitchen
--  Demo seed — run ONCE after schema.sql
-- ============================================================
--  ⚠️ Running this twice will insert duplicate dishes/orders.
--  Safe to skip entirely: the chef can add dishes from the app UI.
-- ============================================================

insert into public.dishes
  (name, category, calories, emoji, recipe_steps, recipe_link, is_active)
values
  -- 主食
  ('番茄鸡蛋面', 'staple', 520, '🍜',
    array[
      '番茄切块，鸡蛋加少许盐打散。',
      '热锅炒蛋盛出，下番茄炒出汁，加一碗热水煮开。',
      '下面条煮熟，放回鸡蛋，加盐和几滴香油，撒葱花。'
    ],
    'https://www.xiachufang.com/search/?keyword=番茄鸡蛋面', true),

  ('扬州炒饭', 'staple', 610, '🍚',
    array[
      '隔夜米饭打散，虾仁、火腿、胡萝卜切丁。',
      '鸡蛋炒散，下配料翻炒，再下米饭炒到粒粒分明。',
      '用盐和白胡椒调味，撒葱花出锅。'
    ],
    null, true),

  ('葱油拌面', 'staple', 480, '🍝',
    array[
      '小葱切段，冷油下锅小火炸到焦香，捞出葱段。',
      '加生抽、老抽和一点糖，调成葱油汁。',
      '面条煮熟，拌入葱油汁，放上葱段。'
    ],
    'https://www.xiachufang.com/search/?keyword=葱油拌面', true),

  ('咖喱鸡肉饭', 'staple', 680, '🍛',
    array[
      '鸡腿肉、土豆、胡萝卜切块。',
      '炒香洋葱和鸡肉，加水煮开后放土豆胡萝卜炖 15 分钟。',
      '放咖喱块搅匀收汁，浇在米饭上。'
    ],
    null, true),

  ('猪肉白菜饺子', 'staple', 560, '🥟',
    array[
      '白菜切碎撒盐挤水，和猪肉馅拌匀，加葱姜、生抽和香油调味。',
      '把馅料包进饺子皮，捏紧收口。',
      '水开下锅，点三次凉水，饺子浮起就熟了。'
    ],
    null, true),

  -- 蔬菜
  ('蒜蓉西兰花', 'vegetable', 120, '🥦',
    array[
      '西兰花掰小朵，盐水泡 10 分钟后焯水 1 分钟。',
      '蒜末小火炒香。',
      '下西兰花大火快炒，加盐和少许蚝油。'
    ],
    null, true),

  ('手撕包菜', 'vegetable', 150, '🥬',
    array[
      '包菜手撕成片，洗净沥干。',
      '干辣椒和蒜片爆香。',
      '大火下包菜快炒，沿锅边淋醋，加盐和生抽。'
    ],
    'https://www.xiachufang.com/search/?keyword=手撕包菜', true),

  ('地三鲜', 'vegetable', 280, '🍆',
    array[
      '茄子、土豆、青椒切块。',
      '茄子土豆分别煎到微焦。',
      '蒜末爆香，下全部食材，加生抽、糖和水淀粉翻炒收汁。'
    ],
    null, true),

  ('凉拌黄瓜', 'vegetable', 80, '🥒',
    array[
      '黄瓜拍裂切段，撒盐腌 5 分钟。',
      '倒掉腌出的水，加蒜末、醋、生抽、糖和香油。',
      '拌匀后冷藏 10 分钟，更爽口。'
    ],
    null, true),

  ('清炒时蔬', 'vegetable', 100, '🥬',
    array[
      '青菜（上海青或油麦菜）洗净沥干。',
      '蒜末爆香。',
      '大火快炒，加盐，断生立刻出锅。'
    ],
    null, true),

  -- 肉类 / 蛋类
  ('可乐鸡翅', 'meat', 420, '🍗',
    array[
      '鸡翅两面划刀，冷水下锅焯水。',
      '煎到两面金黄，加姜片、生抽和少许老抽。',
      '倒入可乐没过鸡翅，中小火收汁，撒白芝麻。'
    ],
    'https://www.xiachufang.com/search/?keyword=可乐鸡翅', true),

  ('红烧肉', 'meat', 650, '🥩',
    array[
      '五花肉切块，冷水下锅焯水。',
      '小火炒糖色，下肉块翻炒上色。',
      '加葱姜、八角、生抽老抽和热水，小火炖 50 分钟，最后大火收汁。'
    ],
    'https://www.xiachufang.com/search/?keyword=红烧肉', true),

  ('宫保鸡丁', 'meat', 380, '🍗',
    array[
      '鸡腿肉切丁，用生抽和淀粉腌 15 分钟。',
      '调好糖醋汁：生抽、醋、糖和水淀粉。',
      '炒香干辣椒花椒，下鸡丁和黄瓜丁，倒入料汁翻匀，撒花生米。'
    ],
    null, true),

  ('黑椒牛柳', 'meat', 360, '🥩',
    array[
      '牛里脊切条，加生抽、黑椒和淀粉腌 20 分钟。',
      '洋葱和彩椒切条。',
      '大火滑炒牛柳盛出，炒香洋葱彩椒，回锅加黑椒酱快炒。'
    ],
    null, true),

  ('糖醋排骨', 'meat', 520, '🍖',
    array[
      '排骨焯水后擦干。',
      '煎至微黄，加冰糖炒化上色。',
      '放醋、生抽、料酒和热水，小火焖 35 分钟，大火收成亮汁，撒芝麻。'
    ],
    null, true),

  ('青椒肉丝', 'meat', 320, '🌶️',
    array[
      '里脊切丝，用生抽和淀粉抓匀。',
      '青椒切丝备用。',
      '热油滑炒肉丝盛出，炒香青椒，回锅加盐和少许蚝油。'
    ],
    null, true),

  -- 汤品 / 饮料
  ('番茄蛋花汤', 'soup', 90, '🍅',
    array[
      '番茄切小块炒软。',
      '加两碗热水煮开。',
      '淋入蛋液，加盐和白胡椒，撒葱花和香油。'
    ],
    null, true),

  ('玉米排骨汤', 'soup', 210, '🌽',
    array[
      '排骨焯水洗净。',
      '和玉米段、姜片一起放入砂锅，加足量热水。',
      '小火炖 60 分钟，出锅前加盐。'
    ],
    'https://www.xiachufang.com/search/?keyword=玉米排骨汤', true),

  ('紫菜蛋花汤', 'soup', 60, '🥣',
    array[
      '紫菜撕小片，鸡蛋打散。',
      '水开下紫菜煮 1 分钟。',
      '淋蛋液，加盐、香油和葱花。'
    ],
    null, true),

  ('冬瓜丸子汤', 'soup', 150, '🍲',
    array[
      '肉馅加葱姜、生抽和淀粉，搅打上劲。',
      '冬瓜切片煮开，挤入小肉丸。',
      '丸子浮起后加盐和白胡椒，撒香菜。'
    ],
    null, true),

  ('冰镇酸梅汤', 'soup', 120, '🧋',
    array[
      '乌梅、山楂、陈皮和甘草冲洗后泡 30 分钟。',
      '加水煮开，转小火 40 分钟。',
      '加冰糖融化，放凉后冷藏。'
    ],
    null, true),

  -- 小吃 / 甜品
  ('红糖糍粑', 'snack', 330, '🍡',
    array[
      '糍粑切条，小火煎到两面金黄。',
      '红糖加少量水熬成糖浆。',
      '淋在糍粑上，撒黄豆粉。'
    ],
    null, true),

  ('双皮奶', 'snack', 220, '🍮',
    array[
      '牛奶煮热倒入碗中，放凉结出奶皮。',
      '蛋清加糖搅匀，牛奶留皮倒出混合，再倒回碗里。',
      '盖保鲜膜蒸 12 分钟，关火焖 5 分钟。'
    ],
    null, true),

  ('烤红薯', 'snack', 180, '🍠',
    array[
      '红薯洗净擦干。',
      '烤箱 200℃ 烤 60 分钟，或空气炸锅 190℃ 烤 40 分钟。',
      '捏起来软软的就好。'
    ],
    null, true),

  ('葱油饼', 'snack', 350, '🫓',
    array[
      '面粉加温水和成软面团，醒 20 分钟。',
      '擀开抹油，撒盐和葱花，卷起再擀成饼。',
      '小火煎到两面金黄。'
    ],
    null, true);

-- ------------------------------------------------------------
-- A completed dinner from yesterday, so the review page is not empty.
-- ------------------------------------------------------------

with demo_order as (
  insert into public.orders (order_date, status, note, submitted_at, completed_at)
  values (
    (now() at time zone 'Asia/Shanghai')::date - 1,
    'completed',
    '今天想吃清淡一点点～',
    now() - interval '1 day',
    now() - interval '20 hours'
  )
  returning id
),
demo_items as (
  insert into public.order_items (order_id, dish_id, status)
  select demo_order.id, d.id, 'served'
  from demo_order
  join public.dishes d
    on d.name in ('番茄鸡蛋面', '蒜蓉西兰花', '可乐鸡翅')
  returning order_id, dish_id
)
insert into public.ratings (order_id, dish_id, rating, comment)
select
  demo_items.order_id,
  demo_items.dish_id,
  case d.name
    when '蒜蓉西兰花' then 4
    else 5
  end,
  case d.name
    when '番茄鸡蛋面' then '番茄汤底超浓郁，面条也刚刚好！'
    when '蒜蓉西兰花' then '蒜香很足，下次少放一点点盐。'
    else '甜咸口完美，鸡翅再多两个也吃得下。'
  end
from demo_items
join public.dishes d on d.id = demo_items.dish_id;

-- ------------------------------------------------------------
-- Two wishes waiting for the chef.
-- ------------------------------------------------------------

insert into public.wishlist (title, note, status, source, rednote_url) values
  ('麻辣香锅', '想吃微辣的，多加藕片和午餐肉。', 'pending_review', 'manual', null),
  ('番茄牛腩', '天气冷了，想喝一锅热汤。', 'pending_review', 'manual', null),
  (
    '小炒黄牛肉（小红书收藏）',
    '牛肉逆着纹理切薄片，大火快炒 30 秒就出锅。',
    'pending_review',
    'share',
    'https://www.xiaohongshu.com/search_result?keyword=%E5%B0%8F%E7%82%92%E9%BB%84%E7%89%9B%E8%82%89'
  );
