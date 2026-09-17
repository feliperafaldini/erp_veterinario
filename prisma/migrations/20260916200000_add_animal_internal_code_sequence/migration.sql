-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "animal_internal_code_seq"
  START 1
  INCREMENT 1
  NO MAXVALUE;

-- CreateFunction: Gera internalCode no formato ANI-000001
CREATE OR REPLACE FUNCTION "generate_animal_internal_code"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."internalCode" := 'ANI-' || LPAD(nextval('"animal_internal_code_seq"')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger: Define internalCode automaticamente antes de INSERT
CREATE OR REPLACE TRIGGER "set_animal_internal_code"
  BEFORE INSERT ON "Animal"
  FOR EACH ROW
  WHEN (NEW."internalCode" IS NULL OR NEW."internalCode" = '')
  EXECUTE FUNCTION "generate_animal_internal_code"();
