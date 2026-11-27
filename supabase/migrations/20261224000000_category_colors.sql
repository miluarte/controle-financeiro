-- Cores das categorias principais (2026-11-27, pedido da Milena): Beleza em rosa, Outros em cinza,
-- nenhuma no verde das entradas nem no vermelho de perigo. As subcategorias herdam a cor da principal.
update categories c set color = v.color
from (values
  ('expense', 'Alimentação', 'orange'),
  ('expense', 'Apostas e jogos', 'rose'),
  ('expense', 'Beleza e cuidados pessoais', 'pink'),
  ('expense', 'Compras', 'fuchsia'),
  ('expense', 'Doações', 'teal'),
  ('expense', 'Educação', 'cyan'),
  ('expense', 'Finanças', 'lime'),
  ('expense', 'Impostos e taxas', 'yellow'),
  ('expense', 'Lazer e entretenimento', 'blue'),
  ('expense', 'Moradia', 'indigo'),
  ('expense', 'Outros', 'gray'),
  ('expense', 'Saúde e bem-estar', 'emerald'),
  ('expense', 'Seguros', 'sky'),
  ('expense', 'Serviços digitais', 'violet'),
  ('expense', 'Transporte', 'amber'),
  ('expense', 'Vestuário', 'purple'),
  ('income', 'Renda', 'teal')
) as v(type, name, color)
where c.parent_id is null and c.type = v.type and c.name = v.name;

-- subcategorias com a cor da principal
update categories s set color = p.color
from categories p
where s.parent_id = p.id and s.color is distinct from p.color;
