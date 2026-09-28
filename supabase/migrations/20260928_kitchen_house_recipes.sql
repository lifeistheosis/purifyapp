-- The Kitchen: fourteen more house recipes, so every kind of fast day has a
-- few to choose from. With the first three that makes seventeen: 4 strict,
-- 7 wine and oil, 3 fish, 3 feast.
--
-- Same terms as the three in 20260713_trapeza_recipes.sql: plain traditional
-- dishes in our own wording, no third party's text, author_id null (the
-- Purify kitchen). One ingredient and one step per line, which the recipe
-- page shows as a list and numbered steps. No photos here: the house
-- recipes' photos are bundled with the app (lib/trapeza/housePhotos.ts), and
-- one set from the admin Community tab replaces them.
--
-- Fixed ids, so re-running inserts nothing twice.
--
-- Applied by hand in the Supabase SQL editor by the owner on 2026-09-28,
-- before this file was committed; it is here so the folder records it. Every
-- statement is idempotent, so the merge running it again changes nothing.

insert into public.trapeza_recipes
  (id, author_id, title, fast_level, season, tradition, summary, ingredients, steps, servings, time_minutes, status)
values
  ('33b5d839-48b1-4d27-aaef-a47f3897ce2e', null,
   'Kutia for Nativity Eve',
   'xerophagy', 'nativity', 'any',
   'Wheat berries with honey, poppy seed and walnuts, set on the table on Nativity Eve in Slavic homes.',
   '1 cup wheat berries
1/2 cup poppy seeds
1/2 cup walnuts, chopped
1/3 cup raisins
3 to 4 tablespoons honey
A pinch of salt',
   'Soak the wheat berries overnight in cold water, then drain.
Cover with fresh water, add the salt, and simmer until tender, about an hour. Drain and cool.
Pour boiling water over the poppy seeds, leave them 20 minutes, drain, and grind or pound them until milky.
Soak the raisins in warm water for ten minutes and drain.
Loosen the honey with two or three tablespoons of warm water.
Stir the poppy seeds, walnuts, raisins and honey through the wheat. Serve at room temperature.',
   'Six', 90, 'published'),

  ('2ac7d34a-c893-4dd0-98d0-979f3f07634b', null,
   'Uzvar, Dried Fruit Compote',
   'xerophagy', 'nativity', 'any',
   'Dried fruit simmered into a sweet drink, served beside kutia on Nativity Eve and good on any strict day.',
   '300 g mixed dried fruit: apples, pears, prunes, apricots
2 litres water
2 to 3 tablespoons honey
A cinnamon stick or a few cloves (optional)',
   'Rinse the dried fruit well.
Put it in a pot with the water and the spices, bring to a boil, then simmer gently for 20 minutes.
Take it off the heat, stir in the honey, and cover.
Leave it to steep for a few hours at least. Serve cool, with some of the fruit in each glass.',
   'Eight', 30, 'published'),

  ('829faeb2-657a-4e0c-acff-16ce1f745dfe', null,
   'Boiled Greens with Lemon',
   'xerophagy', 'lent', 'greek',
   'Horta: wild or garden greens, boiled and dressed with lemon and salt. On days when oil is allowed, finish with a spoon of olive oil.',
   '1 kg greens: chicory, dandelion, chard or spinach
Salt
1 lemon',
   'Trim the tough stems and wash the greens in several changes of water.
Bring a large pot of salted water to the boil and add the greens.
Cook until tender: 5 minutes for spinach or chard, up to 15 for chicory and dandelion.
Drain well and serve warm or cool, with lemon squeezed over and a pinch of salt.
On a wine and oil day, add a good spoon of olive oil.',
   'Four', 25, 'published'),

  ('7ca67583-82f5-4903-aca8-9cad0eed45ed', null,
   'Fasolada, White Bean Soup',
   'oil_wine', 'any', 'greek',
   'The Greek bean soup of the fasting days: white beans, tomato and plenty of olive oil.',
   '500 g dried white beans, soaked overnight
1 onion, chopped
2 carrots, sliced
2 sticks celery, sliced
2 tablespoons tomato paste, or a tin of chopped tomatoes
1/2 cup olive oil
1 bay leaf
Salt and pepper
Parsley, to finish',
   'Drain the soaked beans, cover with fresh water, boil for 5 minutes, then drain again.
Soften the onion, carrot and celery in half the olive oil.
Add the beans, the tomato, the bay leaf and enough water to cover by a few centimetres.
Simmer until the beans are soft and creamy, about an hour and a half, adding water as needed.
Season with salt and pepper, stir in the rest of the olive oil, and finish with chopped parsley.',
   'Six', 120, 'published'),

  ('39323e50-ec05-4814-bd15-7f43770a257c', null,
   'Mujaddara, Lentils and Rice with Onions',
   'oil_wine', 'lent', 'levantine',
   'Lentils and rice under a heap of slowly fried onions, a Lenten staple across the Levant.',
   '1 cup brown or green lentils
3/4 cup long-grain rice or coarse bulgur
3 large onions, thinly sliced
1/2 cup olive oil
1 teaspoon cumin
Salt and pepper',
   'Simmer the lentils in plenty of water for 15 minutes, until just tender. Drain, keeping the water.
Fry the onions slowly in the olive oil until deep brown, about 30 minutes. Set half aside for the top.
Add the rice, cumin, lentils, salt and pepper to the pot with the remaining onions.
Pour in 2 cups of the lentil water, cover, and cook on low heat for 20 minutes, until the rice is done.
Rest it 10 minutes off the heat, then serve under the reserved onions, with a salad on the side.',
   'Four', 70, 'published'),

  ('a03a5de0-ad51-4780-bec9-8264228c07ce', null,
   'Vinegret, Beetroot Salad',
   'oil_wine', 'any', 'russian',
   'The Russian beetroot salad of the fast: beets, potatoes and pickles dressed with sunflower oil.',
   '3 medium beetroots
3 potatoes
2 carrots
3 pickled cucumbers
200 g sauerkraut (optional)
1 small onion
3 tablespoons sunflower oil
Salt',
   'Boil or bake the beetroots, potatoes and carrots in their skins until tender. Cool, then peel.
Dice everything small and even, the pickles and the onion too.
Toss the beetroot with the oil first, on its own, so it does not stain the rest.
Fold in the other vegetables and the sauerkraut, season with salt, and chill before serving.',
   'Six', 75, 'published'),

  ('35c7fa8d-a290-4548-baef-2404a9dbdf1a', null,
   'Prebranac, Baked Beans with Onions',
   'oil_wine', 'nativity', 'balkan',
   'Serbian baked beans with sweet onions and paprika, a fixture of the Christmas fast and of the table on Christmas Eve.',
   '500 g large dried white beans, soaked overnight
4 onions, sliced
1/2 cup sunflower oil
1 tablespoon sweet paprika
2 bay leaves
Salt and pepper',
   'Cook the soaked beans in fresh water with the bay leaves until soft but whole, about an hour. Drain, keeping a cup of the water.
Cook the onions slowly in the oil until soft and golden. Take them off the heat and stir in the paprika.
Layer beans and onions in a baking dish, seasoning each layer, and pour over the reserved water.
Bake at 200°C for about 40 minutes, until the top is browned and most of the liquid has gone.',
   'Six', 150, 'published'),

  ('c2d40815-20c0-4d08-bb13-454951508fcc', null,
   'Briam, Roasted Summer Vegetables',
   'oil_wine', 'dormition', 'greek',
   'Potatoes, courgettes and tomatoes roasted slowly in olive oil, for the August fast when the gardens are full.',
   '3 potatoes
3 courgettes
1 aubergine
2 red onions
1 green pepper
4 ripe tomatoes, grated, or a tin of chopped tomatoes
3 cloves garlic, sliced
1/2 cup olive oil
A handful of parsley and a teaspoon of dried oregano
Salt and pepper',
   'Cut the potatoes, courgettes and aubergine into chunks of the same size, and slice the onions and pepper.
Toss everything in a large roasting tin with the tomatoes, garlic, olive oil, herbs, salt and pepper.
Add half a glass of water, cover with foil and roast at 190°C for 45 minutes.
Uncover, stir gently, and roast 30 to 40 minutes more, until soft and browned at the edges.
It is even better warm or at room temperature the next day.',
   'Six', 100, 'published'),

  ('e661bfa4-2a24-4f0f-b884-56c46da5c704', null,
   'Stuffed Vine Leaves',
   'oil_wine', 'apostles', 'greek',
   'Dolmades: young vine leaves rolled around rice and herbs, made in early summer when the leaves are tender.',
   'About 50 vine leaves, fresh or from a jar
1 cup short-grain rice
2 onions, finely chopped
A bunch each of dill, mint and parsley, chopped
1/2 cup olive oil
2 lemons
Salt and pepper',
   'If the leaves are fresh, blanch them for a minute in boiling water. If they are from a jar, rinse them well.
Soften the onions in half the olive oil, then stir in the rice, the herbs, salt, pepper and the juice of one lemon.
Put a spoonful of filling near the stem end of each leaf, fold in the sides and roll up firmly.
Line a pot with torn leaves and pack the rolls in tightly, seam side down, in layers.
Pour over the rest of the oil, the juice of the second lemon and enough water to just cover. Weigh them down with a plate.
Simmer gently for 45 minutes to an hour, until the rice is soft. Let them cool in the pot.',
   'Six', 110, 'published'),

  ('244dd1cb-1ca7-4453-9273-02dd3b23a4d7', null,
   'Salt Cod with Garlic Potato Sauce',
   'fish', 'lent', 'greek',
   'Bakaliaros skordalia, the Greek dish of the Annunciation: crisp fried salt cod with a garlic and potato sauce.',
   '500 g salt cod
1 cup flour, and cold sparkling water for the batter
Oil for frying
3 floury potatoes
4 cloves garlic
1/2 cup olive oil
2 tablespoons vinegar or lemon juice
Salt
Lemon wedges, to serve',
   'Soak the salt cod for 24 to 36 hours in cold water, changing the water several times. Cut it into pieces and pat dry.
For the sauce, boil the potatoes until soft, then mash them warm with the crushed garlic, olive oil and vinegar, adding a little of the cooking water until smooth. Season.
Whisk the flour with enough cold sparkling water to make a batter like thick cream.
Dip the cod in the batter and fry in hot oil until golden, about 4 minutes. Drain on paper.
Serve hot with the sauce and lemon wedges.',
   'Four', 60, 'published'),

  ('6a797083-bc77-431f-bcfb-6efb8953e78f', null,
   'Ukha, Clear Fish Soup',
   'fish', 'any', 'russian',
   'A clear Russian fish soup with potatoes and a great deal of dill.',
   '600 g white fish such as perch, pike or cod, with the bones or a head for the stock if you have them
3 potatoes, diced
1 onion, halved
1 carrot, sliced
1 bay leaf and a few peppercorns
Salt
A bunch of dill',
   'Simmer the fish bones or head with the onion, bay leaf and peppercorns in 2 litres of water for 20 minutes, then strain.
Add the potatoes and carrot to the clear stock and cook for 10 minutes.
Add the fish in large pieces and simmer gently for 8 to 10 minutes, until just cooked.
Season with salt and serve with plenty of chopped dill.',
   'Four', 50, 'published'),

  ('30a535d5-6b89-4d66-bf16-503bbb545797', null,
   'Bliny for Cheesefare Week',
   'any', 'any', 'russian',
   'Thin Russian pancakes for Cheesefare Week, the last days of butter and milk before Great Lent.',
   '2 cups milk
2 eggs
1 1/4 cups flour
1 tablespoon sugar
A pinch of salt
2 tablespoons melted butter, and more for the pan and to serve',
   'Whisk the eggs, sugar and salt, then whisk in half the milk.
Add the flour and beat to a smooth, thick batter, then thin it with the rest of the milk and the melted butter. Rest it 20 minutes.
Heat a lightly buttered pan over a medium heat and pour in a thin layer of batter, tilting the pan to spread it.
Cook until the edges lift and the underside is golden, about a minute, then turn and cook a few seconds more.
Stack them with a little butter between each. Serve with sour cream, jam or honey.',
   'Four', 45, 'published'),

  ('c8fef50b-c6e4-4c5a-89a4-bd856f2a848e', null,
   'Red Eggs for Pascha',
   'any', 'any', 'any',
   'Eggs dyed a deep red-brown with onion skins, for the Paschal table.',
   '12 white or light brown eggs
The dry skins of 10 to 12 onions (red onions give a deeper colour)
1.5 litres water
2 tablespoons vinegar
A little oil, to polish',
   'Simmer the onion skins in the water for 30 minutes, then strain and let the dye cool.
Put the eggs in a pot, cover them with the cooled dye, and add the vinegar.
Bring slowly to a boil and simmer for 10 to 12 minutes. For a deeper colour, leave them in the dye overnight in the fridge.
Dry the eggs and rub each with a drop of oil for a shine.',
   'Twelve eggs', 60, 'published'),

  ('aa0e358a-c9bd-429c-8105-e262b9fc4ae9', null,
   'Paschal Roast Lamb with Lemon',
   'any', 'any', 'greek',
   'Lamb roasted with lemon, garlic and oregano, with potatoes in the same tin, for the feast of feasts.',
   '1 leg of lamb, about 2 kg
6 cloves garlic
2 lemons
2 tablespoons dried oregano
1/3 cup olive oil
1 kg potatoes, cut in wedges
Salt and pepper',
   'Cut small slits all over the lamb and push in slivers of garlic.
Rub it with the olive oil, lemon juice, oregano, salt and pepper. Leave it an hour, or overnight in the fridge.
Set the lamb in a roasting tin with the potatoes around it, seasoned the same way, and a glass of water in the bottom.
Roast at 180°C for about two and a half hours, turning the potatoes once, until the meat is tender and the potatoes golden.
Rest the lamb for 15 minutes before carving.',
   'Six to eight', 180, 'published')
on conflict (id) do nothing;
