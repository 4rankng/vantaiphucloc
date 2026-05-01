to debug droplet issue, send command via
ssh root@phucloc.tingting.vip "ssh commands"

example
ssh root@phucloc.tingting.vip "docker logs vantaiphucloc-backend-1 --tail 200 2>&1 | tail -80"
ssh root@phucloc.tingting.vip "docker exec vantaiphucloc-postgres-1 psql -U postgres -d vantaiphucloc -c \"SELECT 1=1\""