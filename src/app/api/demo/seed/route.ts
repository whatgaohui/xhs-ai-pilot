import { NextResponse } from 'next/server';
import { db, withDb } from '@/lib/db';

// POST /api/demo/seed - Create demo data
export async function POST() {
  try {
    // Check if demo account already exists
    const existing = await withDb(() => db.xhsAccount.findFirst({
      where: { xhsId: 'demo_user_001' },
    }));

    if (existing) {
      return NextResponse.json(
        { success: false, error: '演示数据已存在，无需重复创建' },
        { status: 409 }
      );
    }

    // Create demo account
    const account = await withDb(() => db.xhsAccount.create({
      data: {
        xhsUrl: 'https://www.xiaohongshu.com/user/profile/demo_user_001',
        xhsId: 'demo_user_001',
        nickname: '美食探店小达人',
        avatarUrl: '',
        bio: '🍜 环球美食探店 | 🍰 甜品控 | 📸 手机摄影爱好者\n分享我的美食发现，带你吃遍城市每个角落~',
        location: '上海',
        followers: 12500,
        following: 328,
        likedCollected: 89300,
        notesCount: 156,
        status: 'success',
        lastScrapedAt: new Date(),
      },
    }));

    // Create demo posts
    const demoPosts = [
      {
        title: '上海新开的日式拉面店，汤头绝了！',
        content: '今天发现了一家新开的日式拉面店，位置在静安寺附近。豚骨汤头熬了12小时，浓郁但不腻。溏心蛋做得恰到好处，叉烧也很厚实。推荐他们家的招牌豚骨拉面和味增拉面~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 3280,
        comments: 256,
        collects: 1890,
        shares: 345,
        tags: '["日式拉面","上海美食","静安寺","探店","美食推荐"]',
        category: '美食探店',
        aiScore: 8.5,
        publishDate: '2025-02-20',
      },
      {
        title: '这家隐藏在弄堂里的咖啡馆太有氛围了',
        content: '在法租界的弄堂里发现了一家超有氛围的咖啡馆，工业风装修搭配绿植，每个角落都很出片。手冲咖啡豆是自家烘焙的，推荐他们的埃塞俄比亚水洗。店里还有可爱的猫咪可以撸~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 5620,
        comments: 432,
        collects: 3200,
        shares: 678,
        tags: '["咖啡馆","法租界","手冲咖啡","打卡","猫咖"]',
        category: '咖啡文化',
        aiScore: 9.2,
        publishDate: '2025-02-18',
      },
      {
        title: '周末在家做了一份超满足的早午餐🥞',
        content: '周末不出门也要吃好的！今天做了一份丰盛的早午餐：松饼配蓝莓和蜂蜜、牛油果吐司、煎蛋、培根，再配上一杯鲜榨橙汁。摆盘花了点心思，成品真的很治愈~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 2150,
        comments: 189,
        collects: 1560,
        shares: 234,
        tags: '["早午餐","居家美食","松饼","Brunch","料理"]',
        category: '居家美食',
        aiScore: 7.8,
        publishDate: '2025-02-15',
      },
      {
        title: '魔都最值得去的5家甜品店合集',
        content: '整理了我心目中上海最值得去的5家甜品店！从经典法甜到创意中式甜点，每一家都有自己的特色。详细的地址、价格和推荐单品都整理好了，甜品控赶紧收藏~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 8930,
        comments: 678,
        collects: 7200,
        shares: 1560,
        tags: '["甜品店","上海甜品","甜品合集","美食攻略","约会"]',
        category: '美食攻略',
        aiScore: 9.5,
        publishDate: '2025-02-12',
      },
      {
        title: '这家火锅店的毛肚也太新鲜了吧',
        content: '被朋友安利了一家火锅店，毛肚真的是现切的，脆嫩爽口！除了毛肚，他们家的鲜鸭肠、黄喉也很新鲜。锅底选了牛油麻辣+番茄双拼，番茄锅底超浓郁。人均大概150左右，性价比很高~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 4100,
        comments: 312,
        collects: 2340,
        shares: 456,
        tags: '["火锅","毛肚","上海美食","聚餐","探店"]',
        category: '美食探店',
        aiScore: 8.1,
        publishDate: '2025-02-08',
      },
      {
        title: '学会这招，在家也能做出餐厅级别的意面',
        content: '今天教大家做一道奶油蘑菇意面，简单又好吃！关键点：1.蘑菇要先煎到上色 2.奶油不要太多 3.煮面水要加到酱汁里乳化。详细步骤看图，学会这招你也可以在家做餐厅级别的意面~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 6780,
        comments: 523,
        collects: 4890,
        shares: 890,
        tags: '["意面","居家料理","食谱","奶油蘑菇意面","厨艺"]',
        category: '居家美食',
        aiScore: 8.8,
        publishDate: '2025-02-05',
      },
      {
        title: '踩雷了！这家网红店真的不值',
        content: '跟风去打卡了这家网红餐厅，说实话很失望...菜品摆盘确实好看，但味道真的很一般，性价比太低了。人均300+但感觉菜量很少，口味偏淡。唯一值得的可能就是环境比较适合拍照吧。姐妹们慎重！',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 3450,
        comments: 890,
        collects: 1200,
        shares: 567,
        tags: '["网红店","踩雷","避坑","餐厅测评","真实评价"]',
        category: '美食测评',
        aiScore: 7.5,
        publishDate: '2025-01-30',
      },
      {
        title: '冬日暖心热可可☕超简单配方',
        content: '冬天最幸福的事情就是捧一杯热可可！分享我的超简单配方：好时可可粉+牛奶+一点炼乳+棉花糖点缀。5分钟搞定，比外面买的好喝100倍！冷天在家窝着喝一杯真的太治愈了~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 1890,
        comments: 145,
        collects: 1350,
        shares: 198,
        tags: '["热可可","冬季饮品","居家美食","简单食谱","暖冬"]',
        category: '居家美食',
        aiScore: 7.2,
        publishDate: '2025-01-25',
      },
      {
        title: '探访百年老字号，传统点心yyds',
        content: '周末去探访了一家百年老字号点心店，招牌枣泥酥和莲蓉月饼真的绝了！纯手工制作，用料扎实。老板说他们的配方已经传了四代人了。这样的传统手艺真的值得被更多人知道和传承~',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 4560,
        comments: 367,
        collects: 2800,
        shares: 523,
        tags: '["老字号","传统点心","中式甜点","非遗美食","文化传承"]',
        category: '传统美食',
        aiScore: 8.6,
        publishDate: '2025-01-20',
      },
      {
        title: '2025最值得期待的新开餐厅清单',
        content: '整理了2025年上半年上海最值得期待的新开餐厅清单！从米其林主厨新店到创意融合菜，每一家都让人期待。我已经提前试了两家，体验感拉满~ 详细信息和预计开业时间都整理好了，吃货们先收藏！',
        coverUrl: '',
        imageUrls: '[]',
        postType: 'normal',
        likes: 7230,
        comments: 534,
        collects: 5600,
        shares: 1230,
        tags: '["新开餐厅","上海美食","2025","美食清单","探店计划"]',
        category: '美食攻略',
        aiScore: 9.0,
        publishDate: '2025-01-15',
      },
    ];

    for (const post of demoPosts) {
      await withDb(() => db.xhsPost.create({
        data: {
          accountId: account.id,
          ...post,
        },
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        account: { id: account.id, nickname: account.nickname },
        postsCreated: demoPosts.length,
      },
    });
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json(
      { success: false, error: '创建演示数据失败' },
      { status: 500 }
    );
  }
}
