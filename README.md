# PharmaSync - Banco de Dados

Banco de dados do **PharmaSync**, um aplicativo mobile de comparação de preços e compra de medicamentos em farmácias cadastradas.

Esta parte do projeto é responsabilidade da **Dupla A (Backend + Banco de Dados)**.

## Tecnologia

- **SGBD:** MySQL 8.0
- **Engine:** InnoDB
- **Charset:** utf8mb4 (`utf8mb4_unicode_ci`)
- **Total de tabelas:** 17

## Estrutura dos arquivos

| Arquivo | Descrição |
|---------|-----------|
| `01_schema_mvp.sql` | Cria o banco e as 5 tabelas essenciais (usuarios, farmacias, medicamentos, pedidos, itens_pedido) |
| `02_schema_complementar.sql` | Cria as 12 tabelas restantes (enderecos, receitas, cartoes, cupons, etc.) |
| `03_dados_teste.sql` | Insere dados de teste (5 usuarios, 2 farmacias, 7 medicamentos, 1 pedido) |

## Como usar

Execute os arquivos **nesta ordem** no MySQL 8.0:

```bash
mysql -u root -p < 01_schema_mvp.sql
mysql -u root -p < 02_schema_complementar.sql
mysql -u root -p pharmasync < 03_dados_teste.sql
```

Ou, dentro do MySQL, use `SOURCE`:

```sql
SOURCE 01_schema_mvp.sql;
SOURCE 02_schema_complementar.sql;
SOURCE 03_dados_teste.sql;
```

## Padrões aplicados (regras de negócio)

- **Preços em centavos** (RN-014): valores monetários como inteiros, evitando erros de arredondamento
- **Soft delete** (RN-013): registros não são apagados, apenas marcados com `deletado_em`
- **Datas em UTC** (RN-015)
- **CPF, CNPJ e e-mail únicos** (RN-001)
- **Senhas em hash bcrypt**: nunca armazenadas em texto puro
- **Chaves estrangeiras** com políticas RESTRICT, CASCADE e SET NULL conforme cada relacionamento

## Modelo de dados

As tabelas se organizam em torno de três entidades centrais: `usuarios`, `farmacias` e `pedidos`. A documentação completa do modelo (dicionário de dados e diagrama ER) está no documento técnico do projeto.
